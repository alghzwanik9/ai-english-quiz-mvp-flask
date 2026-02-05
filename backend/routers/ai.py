import os, json, re, time, random, hashlib
from typing import Any, Dict, List, Optional, Tuple
from flask import Blueprint, request, jsonify
import requests

from models import db, AiQuestion

bp_ai = Blueprint("ai", __name__, url_prefix="/api/ai")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_URL = os.getenv("OLLAMA_URL", f"{OLLAMA_BASE_URL}/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct-q4_K_M")
# نستخدم نفس الفكرة من services/ollama_client.py لكن مع افتراضي مفعّل
USE_OLLAMA = os.getenv("USE_OLLAMA", "1") == "1"

OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
OLLAMA_TOP_P = float(os.getenv("OLLAMA_TOP_P", "0.95"))
OLLAMA_REPEAT_PENALTY = float(os.getenv("OLLAMA_REPEAT_PENALTY", "1.15"))


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
        raise ValueError("No JSON object found")
    return json.loads(m.group(0))


def try_ollama_generate(prompt: str, timeout_sec: int = 60) -> dict:
    """
    نداء عام على Ollama لإرجاع كائن JSON فيه قائمة questions.
    لو USE_OLLAMA معطّل نرمي Exception عشان نستخدم الـ fallback.
    """
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
    if not isinstance(obj, dict) or "questions" not in obj:
        raise ValueError("Invalid JSON format: missing 'questions'")
    return obj


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
- choices MUST be exactly 4 items.
- answer MUST match ONE of the 4 choices exactly.

LESSON TEXT:
"""
{lesson_text}
"""
'''.strip()


def build_topic_prompt(material: str, topic: str, difficulty: str, n: int) -> str:
    """
    برومبت مخصص لحالة المعلّم في الداشبورد:
    نولّد أسئلة بناءً على اسم المادة وموضوع الدرس بدون نص طويل.
    """
    material = (material or "General").strip() or "General"
    topic = (topic or material).strip()
    difficulty = (difficulty or "medium").strip().lower()
    n = max(1, min(int(n or 5), 30))

    return f"""
You are an educational assistant that generates multiple choice questions for English (or other school subjects).

MATERIAL: {material}
TOPIC: {topic}
DIFFICULTY: {difficulty}
NUMBER OF QUESTIONS: {n}

RULES:
- Questions must be clear and suitable for students.
- Prefer focusing strictly on the given material/topic.
- Use simple language.

OUTPUT:
Return ONLY valid JSON with the following schema:
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

- choices MUST be exactly 4 items.
- answer MUST match one of the 4 choices exactly.
""".strip()


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
        db.session.flush()
        ids.append(row.id)
    db.session.commit()
    return ids


@bp_ai.post("/generate-questions")
def ai_generate_questions_short():
    """
    Endpoint مبسّط يطابق ما يستخدمه TeacherDashboard في الفرونت:
    material + topic + difficulty + count
    بدون نص درس كامل.
    """
    body = request.get_json(force=True, silent=True) or {}

    material = (body.get("material") or body.get("subject") or "General").strip()
    topic = (body.get("topic") or "").strip() or material
    difficulty = (body.get("difficulty") or "medium").strip().lower()
    count = int(body.get("count") or body.get("num_questions") or 5)
    count = max(1, min(count, 30))

    # نحاول مع Ollama، لو فشل نستخدم fallback
    used_source = "fallback"
    try:
        prompt = build_topic_prompt(material, topic, difficulty, count)
        payload = try_ollama_generate(prompt)
        questions = normalize_questions(payload)
        if not questions:
            raise ValueError("No questions returned")
        used_source = "ollama"
    except Exception:
        questions = normalize_questions(
            fallback_questions(material, topic, difficulty, count)
        )

    saved_ids = []
    try:
        saved_ids = save_questions(material, topic, difficulty, questions, used_source)
    except Exception:
        saved_ids = []

    return jsonify(
        {
            "ok": True,
            "source": used_source,
            "saved_ids": saved_ids,
            "questions": questions,
        }
    )


@bp_ai.post("/generate-quiz")
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

    prompt = build_lesson_prompt(subject, lesson_text, difficulty, count)

    used_source = "fallback"
    try:
        payload = try_ollama_generate(prompt)
        questions = normalize_questions(payload)
        if not questions:
            raise ValueError("No questions returned")
        used_source = "ollama"
    except Exception:
        questions = normalize_questions(fallback_questions(subject, "From lesson text", difficulty, count))

    saved_ids = []
    if save:
        try:
            saved_ids = save_questions(subject, "From lesson text", difficulty, questions, used_source)
        except Exception:
            saved_ids = []

    return jsonify({
        "ok": True,
        "source": used_source,
        "saved_ids": saved_ids,
        "questions": questions
    })


@bp_ai.get("/questions")
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


@bp_ai.post("/summarize")
def summarize_text():
    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"ok": False, "error": "text is required"}), 400

    prompt = f"""
You are a helpful study assistant.
Summarize the following text for a student in clear, short bullet points.

TEXT:
\"\"\"{text}\"\"\"
""".strip()

    used_source = "fallback"
    summary = ""
    try:
        payload = try_ollama_generate(prompt)
        # نتوقع أن الـ model يرجع {"summary": "..."} أو {"text": "..."} أو {"questions":[...]} لكن هنا نركز على ملخص
        summary = (
            (payload.get("summary") or "").strip()
            or (payload.get("text") or "").strip()
        )
        if not summary:
            raise ValueError("Empty summary")
        used_source = "ollama"
    except Exception:
        # fallback بسيط جداً
        summary = "• هذا ملخص افتراضي.\n• فعّل Ollama للحصول على تلخيصات حقيقية."

    return jsonify({"ok": True, "source": used_source, "summary": summary})


@bp_ai.post("/learning-resources")
def learning_resources():
    body = request.get_json(force=True, silent=True) or {}
    subject = (body.get("subject") or "General").strip()
    topic = (body.get("topic") or "").strip()
    if not topic:
        return jsonify({"ok": False, "error": "topic is required"}), 400

    prompt = f"""
You are a tutor helping a student learn.
Subject: {subject}
Topic: {topic}

Return JSON with:
{{
  "outline": "short outline",
  "points": ["bullet 1", "bullet 2", "..."],
  "examples": ["example 1", "example 2"],
  "video_ideas": ["search phrase 1", "search phrase 2"]
}}
""".strip()

    used_source = "fallback"
    outline = ""
    points = []
    examples = []
    video_ideas = []

    try:
        payload = try_ollama_generate(prompt)
        outline = (payload.get("outline") or "").strip()
        points = payload.get("points") or []
        examples = payload.get("examples") or []
        video_ideas = payload.get("video_ideas") or []
        used_source = "ollama"
    except Exception:
        outline = f"High level overview about {topic} in {subject}."
        points = [
            f"Understand the basic idea of {topic}.",
            f"See 2–3 simple examples related to {subject}.",
        ]
        examples = [f"Example sentence or situation using {topic}."]
        video_ideas = [f"{subject} {topic} explanation for beginners"]

    return jsonify(
        {
            "ok": True,
            "source": used_source,
            "outline": outline,
            "points": points,
            "examples": examples,
            "video_ideas": video_ideas,
        }
    )
