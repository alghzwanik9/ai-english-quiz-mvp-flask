import os
import json
import re
import time
import random
import hashlib
from typing import Any, Dict, Optional, List

import requests
import pdfplumber
from dotenv import load_dotenv

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_migrate import Migrate

from models import db, AiQuestion

# ------------------------------------------------------------
# App / Config
# ------------------------------------------------------------
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required for SQLALCHEMY_DATABASE_URI")

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate = Migrate(app, db)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MATERIALS_FILE = os.path.join(DATA_DIR, "materials.json")

# ------------------------------------------------------------
# Ollama config (SINGLE SOURCE OF TRUTH)
# ------------------------------------------------------------
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_URL = os.getenv("OLLAMA_URL", f"{OLLAMA_BASE_URL}/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct-q4_K_M")

# ✅ Clean API mode: إذا USE_OLLAMA=0 => ممنوع أي fallback
USE_OLLAMA = os.getenv("USE_OLLAMA", "1") == "1"

OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
OLLAMA_TOP_P = float(os.getenv("OLLAMA_TOP_P", "0.95"))
OLLAMA_REPEAT_PENALTY = float(os.getenv("OLLAMA_REPEAT_PENALTY", "1.15"))

# ------------------------------------------------------------
# Utils (materials)
# ------------------------------------------------------------
def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def _load_json(path: str, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
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

# ------------------------------------------------------------
# Ollama helpers (CLEAN MODE)
# ------------------------------------------------------------
def extract_json_object(text: str):
    if not text:
        raise ValueError("Empty response")

    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"\s*```$", "", t)

    try:
        return json.loads(t)
    except Exception:
        pass

    m = re.search(r"\{.*\}", t, flags=re.S)
    if not m:
        raise ValueError("No JSON object found in response")
    return json.loads(m.group(0))

def try_ollama_generate(prompt: str, timeout_sec: int = 60) -> dict:
    if not USE_OLLAMA:
        raise RuntimeError("Ollama disabled via USE_OLLAMA=0")

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": OLLAMA_TEMPERATURE,
            "top_p": OLLAMA_TOP_P,
            "repeat_penalty": OLLAMA_REPEAT_PENALTY,
        },
    }

    r = requests.post(OLLAMA_URL, json=payload, timeout=timeout_sec)
    r.raise_for_status()

    text = (r.json().get("response") or "").strip()
    obj = extract_json_object(text)

    if not isinstance(obj, dict):
        raise ValueError("Invalid JSON: not an object")

    return obj

def normalize_questions(payload: dict):
    qs = payload.get("questions") or []
    if not isinstance(qs, list):
        qs = []

    cleaned = []
    for q in qs:
        if not isinstance(q, dict):
            continue

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
            choices.append(f"Option {len(choices)+1}")
        choices = choices[:4]

        if answer in {"A", "B", "C", "D"}:
            answer = choices[{"A": 0, "B": 1, "C": 2, "D": 3}[answer]]

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
        db.session.flush()
        ids.append(row.id)
    db.session.commit()
    return ids

def service_unavailable(msg: str, details: str = ""):
    payload = {"ok": False, "error": msg}
    if details:
        payload["details"] = details
    return jsonify(payload), 503

# ------------------------------------------------------------
# Prompts (CLEAN)
# ------------------------------------------------------------
def build_topic_prompt(material: str, topic: str, difficulty: str, n: int) -> str:
    material = (material or "General").strip() or "General"
    topic = (topic or material).strip()
    difficulty = (difficulty or "medium").strip().lower()
    n = max(1, min(int(n or 5), 30))

    return f"""
You are an educational assistant that generates multiple choice questions.

MATERIAL: {material}
TOPIC: {topic}
DIFFICULTY: {difficulty}
NUMBER OF QUESTIONS: {n}

OUTPUT:
Return ONLY valid JSON with this schema:
{{
  "questions": [
    {{
      "qtype": "mcq",
      "question": "...",
      "choices": ["...","...","...","..."],
      "answer": "...",
      "explanation": "..."
    }}
  ]
}}

Rules:
- choices MUST be exactly 4 items.
- answer MUST match one of the 4 choices exactly.
""".strip()

def build_lesson_prompt(subject: str, lesson_text: str, difficulty: str, n: int) -> str:
    subject = (subject or "General").strip() or "General"
    difficulty = (difficulty or "medium").strip().lower()
    lesson_text = (lesson_text or "").strip()

    return f'''
You are an educational assistant that generates quiz questions STRICTLY from the provided lesson text.

SUBJECT: {subject}
DIFFICULTY: {difficulty}
NUMBER OF QUESTIONS: {n}

STRICT RULES (MUST FOLLOW):
- Use ONLY information explicitly present in the lesson text below.
- Do NOT add external knowledge.
- Every question MUST be answerable from the lesson text.
- If lesson text is insufficient, create fewer questions but NEVER invent info.

OUTPUT RULES:
- Output MUST be valid JSON only.
- Output format MUST be exactly:
{{
  "questions": [
    {{
      "qtype": "mcq",
      "question": "...",
      "choices": ["...","...","...","..."],
      "answer": "...",
      "explanation": "..."
    }}
  ]
}}

LESSON TEXT:
"""
{lesson_text}
"""
'''.strip()

# ------------------------------------------------------------
# API: Health
# ------------------------------------------------------------
@app.get("/api/health")
def api_health():
    return jsonify({
        "ok": True,
        "use_ollama": USE_OLLAMA,
        "ollama_url": OLLAMA_URL,
        "model": OLLAMA_MODEL,
    })

# ------------------------------------------------------------
# API: Materials
# ------------------------------------------------------------
@app.get("/api/materials")
def list_materials():
    data = _load_json(MATERIALS_FILE, {"materials": []})
    return jsonify(data["materials"])

@app.post("/api/materials")
def create_material():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    description = (body.get("description") or "").strip()
    level = (body.get("level") or "").strip()

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

# ------------------------------------------------------------
# API: Import PDF
# ------------------------------------------------------------
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

# ------------------------------------------------------------
# API: AI (CLEAN — no fallback)
# ------------------------------------------------------------
@app.post("/api/ai/generate-questions")
def ai_generate_questions_short():
    body = request.get_json(force=True, silent=True) or {}

    material = (body.get("material") or body.get("subject") or "General").strip()
    topic = (body.get("topic") or "").strip() or material
    difficulty = (body.get("difficulty") or "medium").strip().lower()
    count = int(body.get("count") or body.get("num_questions") or 5)
    count = max(1, min(count, 30))

    try:
        prompt = build_topic_prompt(material, topic, difficulty, count)
        payload = try_ollama_generate(prompt)
        questions = normalize_questions(payload)

        if not questions:
            return jsonify({"ok": False, "error": "No questions returned from AI"}), 502

        used_source = "ollama"
        saved_ids = save_questions(material, topic, difficulty, questions, used_source)

        return jsonify({"ok": True, "source": used_source, "saved_ids": saved_ids, "questions": questions})

    except Exception as e:
        return service_unavailable("AI generation failed (Ollama).", str(e))

@app.post("/api/ai/generate-quiz")
def ai_generate_quiz_from_text():
    body = request.get_json(force=True, silent=True) or {}

    subject = (body.get("subject") or body.get("material") or "General").strip()
    lesson_text = (body.get("text") or body.get("lesson_text") or "").strip()
    difficulty = (body.get("difficulty") or "medium").strip().lower()
    count = int(body.get("count") or body.get("num_questions") or 5)
    count = max(1, min(count, 30))

    save = body.get("save", True)
    if isinstance(save, str):
        save = save.strip().lower() not in ("0", "false", "no")

    if not lesson_text:
        return jsonify({"ok": False, "error": "text (lesson_text) is required"}), 400

    try:
        prompt = build_lesson_prompt(subject, lesson_text, difficulty, count)
        payload = try_ollama_generate(prompt)
        questions = normalize_questions(payload)

        if not questions:
            return jsonify({"ok": False, "error": "No questions returned from AI"}), 502

        used_source = "ollama"
        saved_ids = []
        if save:
            saved_ids = save_questions(subject, "From lesson text", difficulty, questions, used_source)

        return jsonify({"ok": True, "source": used_source, "saved_ids": saved_ids, "questions": questions})

    except Exception as e:
        return service_unavailable("AI generation failed (Ollama).", str(e))

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

# ------------------------------------------------------------
# Main
# ------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
