import os
import json
import re
import random
import time
import hashlib
import sqlite3
from typing import Any, Dict, List, Tuple, Optional

import requests
import pdfplumber
from flask import Flask, jsonify, request
from flask_cors import CORS

from dotenv import load_dotenv
from flask_migrate import Migrate
from models import db, Test, Question, Choice, AiQuestion


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ===== PostgreSQL (Neon) =====
load_dotenv()

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate = Migrate(app, db)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MATERIALS_FILE = os.path.join(DATA_DIR, "materials.json")

DB_PATH = os.getenv("DB_PATH", "app.db")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_URL = os.getenv("OLLAMA_URL", f"{OLLAMA_BASE_URL}/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct-q4_K_M")
USE_OLLAMA = os.getenv("USE_OLLAMA", "0") == "1"


OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.9"))
OLLAMA_TOP_P = float(os.getenv("OLLAMA_TOP_P", "0.95"))
OLLAMA_REPEAT_PENALTY = float(os.getenv("OLLAMA_REPEAT_PENALTY", "1.15"))


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def _load_json(path: str, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    except Exception:
        return default

def _save_json(path: str, payload):
    _ensure_data_dir()
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

def _now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%S")

def _new_id(prefix="mat"):
    raw = f"{prefix}:{time.time()}:{random.random()}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def ensure_questions_table():  
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material TEXT NOT NULL,
        topic TEXT,
        difficulty TEXT,
        qtype TEXT NOT NULL,
        question TEXT NOT NULL,
        choices_json TEXT,
        answer TEXT NOT NULL,
        explanation TEXT,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL
    )
    """)
    conn.commit()
    conn.close()

# ensure_questions_table()

def build_prompt(material: str, topic: str, difficulty: str, n: int):
    return f"""
You are a question generator for teachers.

Create EXACTLY {n} multiple-choice questions (MCQ) about:
- Material: {material}
- Topic: {topic or "General"}
- Difficulty: {difficulty}

STRICT OUTPUT RULES:
1) Output MUST be valid JSON only. No markdown, no explanation, no extra text.
2) Output format MUST be exactly:
{{
  "questions": [
    {{
      "qtype": "mcq",
      "question": "...",
      "choices": ["A","B","C","D"],
      "answer": "A",
      "explanation": "..."
    }}
  ]
}}
3) choices MUST be exactly 4 items.
4) answer MUST match one of the 4 choices exactly.
"""
@app.get("/api/ai/questions")
def list_saved_questions():
    material = (request.args.get("material") or "").strip()
    limit = int(request.args.get("limit") or 50)
    limit = max(1, min(limit, 200))

    q = AiQuestion.query
    if material:
        q = q.filter(AiQuestion.material == material)

    rows = q.order_by(AiQuestion.id.desc()).limit(limit).all()

    out = []
    for r in rows:
        out.append({
            "id": r.id,
            "material": r.material,
            "topic": r.topic,
            "difficulty": r.difficulty,
            "qtype": r.qtype,
            "question": r.question,
            "choices": json.loads(r.choices_json or "[]"),
            "answer": r.answer,
            "explanation": r.explanation,
            "source": r.source,
            "created_at": r.created_at,
        })

    return jsonify({"ok": True, "items": out})


def extract_json_object(text: str):
    """
    Try to extract a JSON object from a messy LLM response.
    Supports:
    - pure JSON
    - JSON wrapped in ```json ... ```
    - extra text before/after JSON
    """
    if not text:
        raise ValueError("Empty response")

    t = text.strip()
    # remove code fences if present
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"\s*```$", "", t)

    # try direct parse first
    try:
        return json.loads(t)
    except Exception:
        pass

    # try to find a JSON object substring { ... }
    m = re.search(r"\{.*\}", t, flags=re.S)
    if not m:
        raise ValueError("No JSON object found in response")
    return json.loads(m.group(0))


def try_ollama_generate(prompt: str, timeout_sec: int = 60):
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",  # ✅ هذا أهم سطر: يجبر الرد يكون JSON صحيح
        "options": {
            "temperature": 0.2
        }
    }

    r = requests.post(OLLAMA_URL, json=payload, timeout=timeout_sec)
    r.raise_for_status()

    text = (r.json().get("response") or "").strip()

    # غالبًا بعد format=json بيكون JSON نظيف، بس نخلي الاستخراج احتياط
    obj = extract_json_object(text)

    if not isinstance(obj, dict) or "questions" not in obj:
        raise ValueError("Invalid JSON format: missing 'questions'")

    return obj


def fallback_questions(material: str, topic: str, difficulty: str, n: int):
    out = []
    for i in range(n):
        out.append({
            "qtype": "mcq",
            "question": f"[Fallback Q{i+1}] What is the goal of studying {topic or material}?",
            "choices": ["Understanding", "Memorizing", "Ignoring", "Skipping"],
            "answer": "Understanding",
            "explanation": "Learning focuses on understanding."
        })
    return {"questions": out}


def normalize_questions(payload: dict):
    qs = payload.get("questions") or []
    cleaned = []
    for q in qs:
        question = (q.get("question") or "").strip()
        choices = q.get("choices") or []
        answer = (q.get("answer") or "").strip()
        explanation = (q.get("explanation") or "").strip()

        if not question:
            continue
        if not isinstance(choices, list):
            choices = []
        choices = [str(c).strip() for c in choices if str(c).strip()]
        while len(choices) < 4:
            choices.append(f"خيار {len(choices)+1}")
        choices = choices[:4]

        if answer in {"A","B","C","D"}:
            answer = choices[{"A":0,"B":1,"C":2,"D":3}[answer]]
        if answer not in choices:
            answer = choices[0]

        cleaned.append({
            "qtype": "mcq",
            "question": question,
            "choices": choices,
            "answer": answer,
            "explanation": explanation
        })
    return cleaned

def save_questions(material: str, topic: str, difficulty: str, questions: list, source: str):
    now = int(time.time())
    ids = []

    for q in questions:
        row = AiQuestion(
            material=material,
            topic=topic,
            difficulty=difficulty,
            qtype=q.get("qtype", "mcq"),
            question=q["question"],
            choices_json=json.dumps(q.get("choices", []), ensure_ascii=False),
            answer=q["answer"],
            explanation=q.get("explanation", ""),
            source=source,
            created_at=now
        )
        db.session.add(row)
        db.session.flush()  # عشان نجيب id
        ids.append(row.id)

    db.session.commit()
    return ids


@app.post("/api/ai/generate-questions")

def ai_generate_questions():
    body = request.get_json(force=True, silent=True) or {}
    material = (body.get("material") or "").strip()
    topic = (body.get("topic") or "").strip()
    difficulty = (body.get("difficulty") or "medium").strip().lower()
    count = int(body.get("count") or 5)
    if not material:
        return jsonify({"ok": False, "error": "material is required"}), 400
    count = max(1, min(count, 20))

    prompt = build_prompt(material, topic, difficulty, count)

    used_source = "fallback"
      
    try:
        payload = try_ollama_generate(prompt)
        questions = normalize_questions(payload)
        if not questions:
            raise ValueError("No questions returned")
        used_source = "ollama"
    except Exception:
        questions = normalize_questions(fallback_questions(material, topic, difficulty, count))



    ids = save_questions(material, topic, difficulty, questions, used_source)
    return jsonify({"ok": True, "source": used_source, "saved_ids": ids, "questions": questions})


# ===== API: Health =====
@app.get("/api/health")
def api_health():
    return jsonify({
        "ok": True,
        "use_ollama": USE_OLLAMA,
        "ollama_url": OLLAMA_URL,
        "model": OLLAMA_MODEL
    })

# ===== API: Materials =====
@app.get("/api/materials")
def list_materials():
    data = _load_json(MATERIALS_FILE, {"materials": []})
    return jsonify(data["materials"])

@app.post("/api/materials")
def create_material():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    description = (body.get("description") or "").strip()
    level = (body.get("level") or "").strip()  # optional

    if not name:
        return jsonify({"error": "name is required"}), 400

    data = _load_json(MATERIALS_FILE, {"materials": []})
    mat = {
        "id": _new_id("mat"),
        "name": name,
        "description": description,
        "level": level,
        "created_at": _now_iso(),
    }
    data["materials"].insert(0, mat)
    _save_json(MATERIALS_FILE, data)
    return jsonify(mat), 201

@app.get("/api/materials/<mat_id>")
def get_material(mat_id):
    data = _load_json(MATERIALS_FILE, {"materials": []})
    for m in data["materials"]:
        if m["id"] == mat_id:
            return jsonify(m)
    return jsonify({"error": "not found"}), 404

# ===== Ollama / LLaMA config (FIXED) =====
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_URL = os.getenv("OLLAMA_URL", f"{OLLAMA_BASE_URL}/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct-q4_K_M")
USE_OLLAMA = True


# Tuning for diversity (Ollama options)
OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.9"))
OLLAMA_TOP_P = float(os.getenv("OLLAMA_TOP_P", "0.95"))
OLLAMA_REPEAT_PENALTY = float(os.getenv("OLLAMA_REPEAT_PENALTY", "1.15"))

# ===== Bigger vocab bank (reduce repetition in mock) =====
VOCAB_BY_GRADE = {
    4: [
        "family","mother","father","brother","sister","school","class","teacher","friend",
        "happy","sad","angry","tired","big","small","new","old","hot","cold",
        "cat","dog","bird","house","book","pen","bag","chair","table","play","read","write"
    ],
    5: [
        "weather","sunny","rainy","cloudy","windy","holiday","travel","city","country","market",
        "friendly","careful","helpful","beautiful","dangerous","important","different","easy","difficult",
        "breakfast","lunch","dinner","sports","basketball","football","swim","visit","learn","practice"
    ],
    6: [
        "practice","healthy","exercise","food","vegetables","fruit","important","different","example",
        "project","homework","subject","science","history","computer","future","plan","improve","choose",
        "between","because","before","after","always","sometimes","usually","never"
    ],
    7: [
        "grammar","sentence","subject","verb","object","present simple","past simple","comparative","superlative",
        "adjective","adverb","preposition","pronoun","article","question","answer"
    ],
    8: [
        "present perfect","modal verbs","passive voice","conditionals","if clause","permission","advice",
        "should","must","can","could","might","report","explain","describe"
    ],
    9: [
        "reported speech","relative clauses","first conditional","second conditional","active","passive",
        "although","however","therefore","because","despite","unless"
    ],
}

SUPPORTED_TYPES = {"mcq", "reading_mcq", "tf", "fill", "reorder"}

def _now_id() -> int:
    return int(time.time() * 1000) + random.randint(0, 999)

def _norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9\s\.\?\!']", "", s)
    return s

def _fingerprint(q: Dict[str, Any]) -> str:
    """
    Create stable fingerprint to prevent duplicates.
    We use question/passage + choices/answer/words depending on type.
    """
    t = q.get("type", "mcq")
    base = _norm(q.get("question", "")) + "|" + _norm(q.get("passage", ""))
    if t in ("mcq", "reading_mcq"):
        choices = q.get("choices") or []
        base += "|" + "|".join(_norm(c) for c in choices)
        base += "|" + str(q.get("correctIndex"))
    elif t == "tf":
        base += "|" + str(bool(q.get("answer")))
    elif t == "fill":
        base += "|" + _norm(q.get("answer", ""))
    elif t == "reorder":
        words = q.get("words") or []
        base += "|" + "|".join(_norm(w) for w in words)
        base += "|" + _norm(q.get("answer", ""))
    return hashlib.sha1(base.encode("utf-8")).hexdigest()

def _extract_json(text: str) -> Optional[Any]:
    """
    Accepts:
    - JSON array: [...]
    - OR JSON object with "questions": [...]
    """
    m_obj = re.search(r"\{.*\}", text, re.S)
    if m_obj:
        try:
            obj = json.loads(m_obj.group(0))
            if isinstance(obj, dict) and isinstance(obj.get("questions"), list):
                return obj["questions"]
        except Exception:
            pass

    m_arr = re.search(r"\[.*\]", text, re.S)
    if not m_arr:
        return None
    try:
        return json.loads(m_arr.group(0))
    except Exception:
        return None

def _validate_one(q: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(q, dict):
        return None

    qtype = str(q.get("type", "mcq")).strip()
    if qtype not in SUPPORTED_TYPES:
        return None

    qid = q.get("id") or _now_id()
    question = str(q.get("question", "")).strip()
    if not question:
        return None

    out = {"id": int(qid), "type": qtype, "question": question}

    if qtype == "reading_mcq":
        passage = str(q.get("passage", "")).strip()
        if not passage:
            return None
        out["passage"] = passage

    if qtype in ("mcq", "reading_mcq"):
        choices = q.get("choices")
        correct = q.get("correctIndex")
        if not isinstance(choices, list) or len(choices) != 4:
            return None
        try:
            correct = int(correct)
        except Exception:
            return None
        if correct < 0 or correct > 3:
            return None
        out["choices"] = [str(c) for c in choices]
        out["correctIndex"] = correct
        return out

    if qtype == "tf":
        ans = q.get("answer")
        if isinstance(ans, bool):
            out["answer"] = ans
        else:
            s = str(ans).strip().lower()
            if s in ("true", "1", "yes"):
                out["answer"] = True
            elif s in ("false", "0", "no"):
                out["answer"] = False
            else:
                return None
        return out

    if qtype == "fill":
        ans = str(q.get("answer", "")).strip()
        if not ans:
            return None
        out["answer"] = ans
        return out

    if qtype == "reorder":
        words = q.get("words")
        ans = str(q.get("answer", "")).strip()
        if not isinstance(words, list) or len(words) < 3:
            return None
        if not ans:
            return None
        out["words"] = [str(w) for w in words]
        out["answer"] = ans
        return out

    return None

def _dedupe(qs: List[Dict[str, Any]], seen: set) -> List[Dict[str, Any]]:
    out = []
    for q in qs:
        fp = _fingerprint(q)
        if fp in seen:
            continue
        seen.add(fp)
        out.append(q)
    return out

def _mock_generate_batch(
    grade: int, skill: str, difficulty: str, types: List[str], count: int, material: str
) -> List[Dict[str, Any]]:
    bank = VOCAB_BY_GRADE.get(grade, VOCAB_BY_GRADE.get(5, []))
    if not bank:
        bank = ["happy", "school", "friend", "read", "write"]

    def pick():
        return random.choice(bank)

    qs: List[Dict[str, Any]] = []
    for _ in range(count):
        t = random.choice(types) if types else "mcq"
        qid = _now_id()

        if skill == "reading" and "reading_mcq" in types:
            passage = random.choice([
                "Sara has a small cat. The cat is white and friendly.",
                "Ali goes to school by bus. He is always on time.",
                "Mona likes apples and bananas. She eats fruit every day."
            ])
            choices = ["white", "black", "brown", "gray"]
            random.shuffle(choices)
            correct = choices.index("white") if "white" in passage else random.randint(0, 3)
            qs.append({
                "id": qid,
                "type": "reading_mcq",
                "passage": passage,
                "question": f"[{material}] Answer the question based on the passage." if material else "Answer the question based on the passage.",
                "choices": choices,
                "correctIndex": correct
            })
            continue

        if t == "tf":
            stmt = random.choice([
                "He goes to school every day.",
                "She are a student.",
                "We is happy today.",
                "They play football after school."
            ])
            ans = not ("are" in stmt and "She" in stmt) and not ("We is" in stmt)
            qs.append({"id": qid, "type": "tf", "question": f"[{material}] {stmt}" if material else stmt, "answer": ans})
            continue

        if t == "fill":
            if skill == "grammar":
                qs.append({"id": qid, "type": "fill", "question": f"[{material}] She ____ to school every day." if material else "She ____ to school every day.", "answer": "goes"})
            else:
                w = pick()
                qs.append({"id": qid, "type": "fill", "question": f"[{material}] I like ____ ." if material else "I like ____ .", "answer": w})
            continue

        if t == "reorder":
            if skill == "grammar":
                words = ["She", "goes", "to", "school", "every", "day"]
                random.shuffle(words)
                qs.append({"id": qid, "type": "reorder", "question": f"[{material}] Arrange the words to make a correct sentence:" if material else "Arrange the words to make a correct sentence:", "words": words, "answer": "She goes to school every day"})
            else:
                words = ["I", "am", "a", "student"]
                random.shuffle(words)
                qs.append({"id": qid, "type": "reorder", "question": f"[{material}] Arrange the words to make a correct sentence:" if material else "Arrange the words to make a correct sentence:", "words": words, "answer": "I am a student"})
            continue

        # default MCQ
        if skill == "grammar":
            choices = ["go", "goes", "going", "goed"]
            random.shuffle(choices)
            qs.append({
                "id": qid,
                "type": "mcq",
                "question": f"[{material}] Choose the correct option ({difficulty}): She ____ to school every day." if material else f"Choose the correct option ({difficulty}): She ____ to school every day.",
                "choices": choices,
                "correctIndex": choices.index("goes")
            })
        else:
            word = pick()
            distractors = list({pick(), pick(), pick()} - {word})
            while len(distractors) < 3:
                distractors.append(pick())
            choices = [word] + distractors[:3]
            random.shuffle(choices)
            qs.append({
                "id": qid,
                "type": "mcq",
                "question": f"[{material}] Choose the best word meaning/usage: '{word}'" if material else f"Choose the best word meaning/usage: '{word}'",
                "choices": choices,
                "correctIndex": choices.index(word)
            })

    return qs

def _ollama_generate_batch(
    grade: int, skill: str, difficulty: str, types: List[str], count: int,
    unit_text: str, material: str, avoid_stems: List[str]
) -> List[Dict[str, Any]]:
    context = (unit_text or "").strip()
    if context:
        context = context[:4500]

    material_line = f"Material/Unit: {material}" if material else "Material/Unit: (not provided)"

    types_str = ", ".join(types) if types else "mcq"
    avoid_str = "\n".join(f"- {s}" for s in (avoid_stems or [])[:20])

    prompt = f"""
You are an English teacher.
Generate EXACTLY {count} questions for Grade {grade}.

Skill: {skill}
Difficulty: {difficulty}
{material_line}
Allowed question types: {types_str}

IMPORTANT:
- Return ONLY valid JSON.
- Output must be a JSON object with this exact format:
{{
  "questions": [ ... ]
}}

Type schemas:
1) mcq:
{{"id": 1, "type":"mcq", "question":"...", "choices":["A","B","C","D"], "correctIndex": 0}}

2) reading_mcq:
{{"id": 2, "type":"reading_mcq", "passage":"...", "question":"...", "choices":["A","B","C","D"], "correctIndex": 2}}

3) tf:
{{"id": 3, "type":"tf", "question":"...", "answer": true}}

4) fill:
{{"id": 4, "type":"fill", "question":"I ___ a student.", "answer":"am"}}

5) reorder:
{{"id": 5, "type":"reorder", "question":"Arrange the words ...", "words":["..."], "answer":"..."}}

Rules:
- Do NOT repeat the same idea. Avoid near-duplicates.
- Questions must match the provided material/unit when possible.
- For mcq/reading_mcq: choices must be EXACTLY 4, and only one correct.
- For fill: answer is ONE word (or short phrase for grade 8-9).
- For tf: statement must be clear.
- For reorder: provide shuffled words; answer is the correct sentence.

Avoid these stems (do not repeat them):
{avoid_str if avoid_str else "- (none)"}

{"Lesson text (if provided, base questions on it):" if context else ""}
{context}
""".strip()

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": OLLAMA_TEMPERATURE,
            "top_p": OLLAMA_TOP_P,
            "repeat_penalty": OLLAMA_REPEAT_PENALTY
        }
    }

    r = requests.post(OLLAMA_URL, json=payload, timeout=120)
    r.raise_for_status()
    text = r.json().get("response", "")

    raw = _extract_json(text)
    if raw is None:
        raise ValueError("Model did not return valid JSON")
    if not isinstance(raw, list):
        raise ValueError("Invalid JSON: questions must be an array")

    cleaned: List[Dict[str, Any]] = []
    for item in raw:
        q = _validate_one(item)
        if q:
            cleaned.append(q)

    return cleaned

def _generate_with_retry(
    grade: int, skill: str, difficulty: str, count: int,
    types: List[str], unit_text: str, material: str,
    pool_multiplier: int, avoid_from_client: List[str]
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    seen = set()
    out: List[Dict[str, Any]] = []

    # types default
    if not types:
        if skill == "reading":
            types = ["reading_mcq"]
        elif skill == "grammar":
            types = ["mcq", "fill", "tf", "reorder"]
        else:
            types = ["mcq", "fill", "tf"]

    types = [t for t in types if t in SUPPORTED_TYPES]
    if not types:
        types = ["mcq"]

    pool_multiplier = max(1, min(6, int(pool_multiplier or 3)))
    max_attempts = 6
    warning = None

    for attempt in range(max_attempts):
        need = count - len(out)
        if need <= 0:
            break

        # generate more to survive filtering
        batch_n = min(60, max(need, int(need * (1.2 + 0.4 * pool_multiplier))))

        # avoid stems from already generated + from client (regenerate/preview)
        avoid_stems = [(_norm(q.get("question", "")) + " " + _norm(q.get("passage", ""))).strip() for q in out]
        avoid_stems = [s[:120] for s in avoid_stems if s]

        client_avoid = [(_norm(x)[:120]) for x in (avoid_from_client or []) if _norm(x)]
        avoid_stems = (client_avoid + avoid_stems)[:40]

        try:
            if USE_OLLAMA:
                batch = _ollama_generate_batch(
                    grade=grade, skill=skill, difficulty=difficulty,
                    types=types, count=batch_n,
                    unit_text=unit_text, material=material,
                    avoid_stems=avoid_stems
                )
            else:
                batch = _mock_generate_batch(
                    grade=grade, skill=skill, difficulty=difficulty,
                    types=types, count=batch_n, material=material
                )
        except Exception as e:
            warning = f"AI fallback used: {e.__class__.__name__}: {e}"
            batch = _mock_generate_batch(grade, skill, difficulty, types, batch_n, material)

        batch = [q for q in batch if q]
        batch = _dedupe(batch, seen)
        out.extend(batch)

        if len(out) > count:
            out = out[:count]

    # final validate
    final: List[Dict[str, Any]] = []
    for q in out:
        v = _validate_one(q)
        if v:
            final.append(v)
    final = final[:count]

    if len(final) < count:
        warning = warning or "Could not reach full count without duplicates; enable Ollama for best results."

    return final, warning

@app.get("/health")
def health():
    return jsonify(status="ok", use_ollama=USE_OLLAMA, model=OLLAMA_MODEL)

@app.post("/api/import/pdf")
def import_pdf():
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400

    f = request.files["file"]
    text = ""
    with pdfplumber.open(f) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"

    return jsonify({"text": text[:50000]})

@app.post("/api/generate-questions")
def generate_questions():
    data = request.get_json(force=True) or {}
    grade = int(data.get("grade", 5))
    skill = str(data.get("skill", "vocabulary")).strip().lower()
    difficulty = str(data.get("difficulty", "easy")).strip().lower()
    count = int(data.get("count", 10))
    count = max(1, min(80, count))
    unit_text = str(data.get("unitText", ""))

    material = str(data.get("material", "")).strip()
    pool_multiplier = int(data.get("poolMultiplier", 3))

    avoid_from_client = data.get("avoid", [])
    if not isinstance(avoid_from_client, list):
        avoid_from_client = []
    avoid_from_client = [str(x) for x in avoid_from_client if str(x).strip()]

    types = data.get("types", None)
    if isinstance(types, list):
        types = [str(t).strip() for t in types]
    else:
        types = []

    qs, warning = _generate_with_retry(
        grade=grade, skill=skill, difficulty=difficulty,
        count=count, types=types, unit_text=unit_text,
        material=material, pool_multiplier=pool_multiplier,
        avoid_from_client=avoid_from_client
    )

    resp = {"questions": qs}
    if warning:
        resp["warning"] = warning
    return jsonify(resp)

@app.post("/api/regenerate-question")
def regenerate_question():
    data = request.get_json(force=True) or {}
    grade = int(data.get("grade", 5))
    skill = str(data.get("skill", "vocabulary")).strip().lower()
    difficulty = str(data.get("difficulty", "easy")).strip().lower()
    unit_text = str(data.get("unitText", ""))

    material = str(data.get("material", "")).strip()

    qtype = str(data.get("type", "mcq")).strip()
    if qtype not in SUPPORTED_TYPES:
        qtype = "mcq"

    avoid = data.get("avoid", [])
    if not isinstance(avoid, list):
        avoid = []
    avoid = [str(x)[:120] for x in avoid if str(x).strip()]

    try:
        if USE_OLLAMA:
            batch = _ollama_generate_batch(grade, skill, difficulty, [qtype], 10, unit_text, material, avoid)
        else:
            batch = _mock_generate_batch(grade, skill, difficulty, [qtype], 10, material)
    except Exception:
        batch = _mock_generate_batch(grade, skill, difficulty, [qtype], 10, material)

    for item in batch:
        v = _validate_one(item)
        if not v:
            continue
        stem = (_norm(v.get("question", "")) + " " + _norm(v.get("passage", ""))).strip()[:120]
        if stem and stem in [ _norm(x)[:120] for x in avoid ]:
            continue
        return jsonify({"question": v})

    return jsonify({"error": "Could not regenerate"}), 400

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
