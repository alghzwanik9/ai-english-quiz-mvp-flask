# backend/routers/ai.py  (أو نفس مسارك)
import os, json, re, time
from typing import Any, Dict

from flask import Blueprint, request, jsonify
import requests
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.ollama_client import generate_questions, generate_json, OLLAMA_BASE_URL, OLLAMA_MODEL

from models import db, AiQuestion

bp_ai = Blueprint("ai", __name__, url_prefix="/api/ai")

# -----------------------------
# Helpers
# -----------------------------


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
        # لازم 4 خيارات
        while len(choices) < 4:
            choices.append(f"Option {len(choices)+1}")
        choices = choices[:4]

        # دعم A/B/C/D
        if answer in {"A", "B", "C", "D"}:
            answer = choices[{"A": 0, "B": 1, "C": 2, "D": 3}[answer]]

        if answer not in choices:
            answer = choices[0]

        cleaned.append(
            {
                "qtype": "mcq",
                "question": question,
                "choices": choices,
                "answer": answer,
                "explanation": explanation,
            }
        )

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
            created_at=now,
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


# -----------------------------
# Routes
# -----------------------------

@bp_ai.post("/generate-questions")
@jwt_required()
def ai_generate_questions_short():
    payload = request.get_json(silent=True) or {}

    material = (payload.get("material") or "English").strip()
    topic = (payload.get("topic") or "").strip()
    difficulty = (payload.get("difficulty") or "easy").strip()
    count = int(payload.get("count") or 5)

    user_id = get_jwt_identity()

    # ✅ هنا: استدعاء Ollama عندك لازم يرجّع "قائمة" dicts
    # مثال الشكل المطلوب:
    # generated = [
    #   {"qtype":"mcq","question":"...","choices":[...],"answer":"...","explanation":"..."},
    # ]
    generated = generate_questions(material, topic, difficulty, count)
    print("generated type:", type(generated), "len:", len(generated))
    # print("first item:", generated[0] if generated else None)  # debug only

    saved_ids = []
    for item in generated:
        row = AiQuestion(
            created_by_user_id=user_id,
            material=material,
            topic=topic,
            difficulty=difficulty,
            qtype=item.get("qtype", "mcq"),
            question=item["question"],
            choices_json=json.dumps(item.get("choices", []), ensure_ascii=False),
            answer=item["answer"],
            explanation=item.get("explanation"),
            source="ollama",
            created_at=int(time.time()),
        )
        db.session.add(row)
        db.session.flush()
        saved_ids.append(row.id)

    db.session.commit()
    return jsonify(ok=True, saved_ids=saved_ids, count=len(saved_ids))

@bp_ai.post("/ollama")
@jwt_required()
def ai_ollama():

    payload = request.get_json(silent=True) or {}
    prompt = (payload.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"ok": False, "error": "prompt is required"}), 400

    try:
        r = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=90,
        )
        r.raise_for_status()
        data = r.json()
        return jsonify({"ok": True, "output": (data.get("response") or "").strip()})
    except requests.RequestException as e:
        return jsonify({"ok": False, "error": f"Ollama request failed: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@bp_ai.post("/generate-quiz")
@jwt_required()
def ai_generate_quiz_from_text():
    """
    Clean API:
    - إذا Ollama فشل => 503 (بدون fallback)
    - يحفظ في DB فقط عند النجاح (إذا save=true)
    """
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
        payload = generate_json(prompt)
        if not isinstance(payload, dict):
            raise ValueError("Ollama returned a list instead of a JSON object")

        questions = normalize_questions(payload)
        if not questions:
            return jsonify({"ok": False, "error": "No questions returned from AI"}), 502

        used_source = "ollama"
        saved_ids = []
        if save:
            saved_ids = save_questions(subject, "From lesson text", difficulty, questions, used_source)

        return jsonify(
            {"ok": True, "source": used_source, "saved_ids": saved_ids, "questions": questions}
        )

    except Exception as e:
        return service_unavailable("AI generation failed (Ollama).", str(e))


@bp_ai.get("/questions")
@jwt_required()
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
        out.append(
            {
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
            }
        )

    return jsonify({"ok": True, "items": out})


@bp_ai.post("/summarize")
@jwt_required()
def summarize_text():
    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"ok": False, "error": "text is required"}), 400

    prompt = f"""
You are a helpful study assistant.
Summarize the following text for a student in clear, short bullet points.

Return ONLY JSON like:
{{"summary": "..." }}

TEXT:
\"\"\"{text}\"\"\"
""".strip()

    try:
        payload = generate_json(prompt)
        if not isinstance(payload, dict):
            raise ValueError("Ollama returned a list instead of a JSON object")
        summary = ((payload.get("summary") or "").strip() or (payload.get("text") or "").strip())
        if not summary:
            return jsonify({"ok": False, "error": "Empty summary from AI"}), 502

        return jsonify({"ok": True, "source": "ollama", "summary": summary})

    except Exception as e:
        return service_unavailable("AI summarize failed (Ollama).", str(e))


@bp_ai.post("/learning-resources")
@jwt_required()
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

Return ONLY JSON with:
{{
  "outline": "short outline",
  "points": ["bullet 1", "bullet 2"],
  "examples": ["example 1", "example 2"],
  "video_ideas": ["search phrase 1", "search phrase 2"]
}}
""".strip()

    try:
        payload = generate_json(prompt)
        if not isinstance(payload, dict):
            raise ValueError("Ollama returned a list instead of a JSON object")

        outline = (payload.get("outline") or "").strip()
        points = payload.get("points") or []
        examples = payload.get("examples") or []
        video_ideas = payload.get("video_ideas") or []

        # تنظيف بسيط
        if not isinstance(points, list):
            points = []
        if not isinstance(examples, list):
            examples = []
        if not isinstance(video_ideas, list):
            video_ideas = []

        return jsonify(
            {
                "ok": True,
                "source": "ollama",
                "outline": outline,
                "points": points,
                "examples": examples,
                "video_ideas": video_ideas,
            }
        )

    except Exception as e:
        return service_unavailable("AI learning-resources failed (Ollama).", str(e))
