from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from authz import teacher_required
from models import db, Test, Question, Choice, Attempt
from routers.ai import (
    build_lesson_prompt,
    try_ollama_generate,
    fallback_questions,
    normalize_questions,
    save_questions,
)

bp_teacher = Blueprint("teacher", __name__, url_prefix="/api/teacher")


def serialize_test(test: Test, include_questions: bool = True):
    data = {
        "id": test.id,
        "name": test.name,
        "subject": test.subject,
        "difficulty": test.difficulty,
        "created_at": test.created_at.isoformat() if test.created_at else None,
        # ✅ مفيد للمعلم عشان ينسخ رابط الاختبار
        "public_token": test.public_token,
    }

    if include_questions:
        items = []
        for q in test.questions:
            choices = [c.choice_text for c in q.choices]
            items.append(
                {
                    "id": q.id,
                    "qtype": "mcq",
                    "question": q.question,
                    "choices": choices,
                    "answer": q.answer,  # المعلم يشوفها عادي
                    "explanation": q.explanation or "",
                }
            )
        data["questions"] = items
        data["q"] = len(items)

    return data


@bp_teacher.get("/tests/<int:test_id>/results")
@teacher_required
def test_results(test_id: int):
    teacher_id = get_jwt_identity()

    test = Test.query.filter_by(id=test_id, teacher_id=teacher_id).first_or_404()

    rows = (
        Attempt.query
        .filter_by(teacher_id=teacher_id, test_id=test.id)
        .order_by(Attempt.created_at.desc())
        .all()
    )

    items = []
    for a in rows:
        items.append({
            "id": a.id,
            "student_name": a.student_name or "",
            "student_email": a.student_email or "",
            "score": a.score,
            "total": a.total,
            "percent": a.percent,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return jsonify({"ok": True, "test": {"id": test.id, "name": test.name}, "items": items})


@bp_teacher.get("/results")
@teacher_required
def teacher_results():
    teacher_id = get_jwt_identity()

    rows = (
        Attempt.query
        .filter_by(teacher_id=teacher_id)
        .order_by(Attempt.created_at.desc())
        .limit(200)
        .all()
    )

    items = []
    for a in rows:
        items.append({
            "id": a.id,
            "test_id": a.test_id,
            "student_name": a.student_name or "",
            "student_email": a.student_email or "",
            "score": a.score,
            "total": a.total,
            "percent": a.percent,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return jsonify({"ok": True, "items": items})


@bp_teacher.get("/tests")
@teacher_required
def list_tests():
    teacher_id = get_jwt_identity()

    tests = (
        Test.query
        .filter_by(teacher_id=teacher_id)
        .order_by(Test.created_at.desc())
        .all()
    )

    out = [serialize_test(t, include_questions=False) for t in tests]
    return jsonify({"ok": True, "items": out})


@bp_teacher.get("/tests/<int:test_id>")
@teacher_required
def get_test(test_id: int):
    teacher_id = get_jwt_identity()

    test = (
        Test.query
        .filter_by(id=test_id, teacher_id=teacher_id)
        .first_or_404()
    )

    return jsonify({"ok": True, "item": serialize_test(test, include_questions=True)})


@bp_teacher.post("/tests")
@teacher_required
def create_test():
    """
    إنشاء اختبار جديد مع أسئلة متعددة الاختيارات.
    متوقَّع body بالشكل:
    {
      "name": "...",
      "subject": "...",
      "difficulty": "easy|medium|hard",
      "questions": [
        {
          "question": "...",
          "choices": ["...","...","...","..."],
          "answer": "...",
          "explanation": "..."
        }
      ]
    }
    """
    body = request.get_json(silent=True) or {}

    name = (body.get("name") or "").strip()
    subject = (body.get("subject") or "").strip() or "General"
    difficulty = (body.get("difficulty") or "easy").strip().lower()
    questions = body.get("questions") or []

    if not name:
        return jsonify({"ok": False, "error": "name is required"}), 400

    if not isinstance(questions, list) or not questions:
        return jsonify({"ok": False, "error": "questions must be a non-empty list"}), 400

    # ✅ لازم نخزن teacher_id في جدول tests
    teacher_id = get_jwt_identity()

    test = Test(
        teacher_id=teacher_id,
        name=name,
        subject=subject,
        difficulty=difficulty
    )
    db.session.add(test)
    db.session.flush()

    for q in questions:
        q_text = (q.get("question") or "").strip()
        if not q_text:
            continue

        choices_raw = q.get("choices") or []
        if not isinstance(choices_raw, list):
            choices_raw = []

        choices = [str(c).strip() for c in choices_raw if str(c).strip()]
        if len(choices) < 2:
            continue

        answer = (q.get("answer") or "").strip()
        if answer not in choices:
            answer = choices[0]

        explanation = (q.get("explanation") or "").strip()

        row_q = Question(
            test_id=test.id,
            question=q_text,
            answer=answer,
            explanation=explanation,
        )
        db.session.add(row_q)
        db.session.flush()

        for c_text in choices:
            db.session.add(Choice(question_id=row_q.id, choice_text=c_text))

    db.session.commit()

    # ✅ رجّع التوكن عشان المعلّم يشارك الرابط
    return jsonify({
        "ok": True,
        "item": serialize_test(test, include_questions=True),
        "share_token": test.public_token
    }), 201


@bp_teacher.post("/import-questions")
@teacher_required
def import_questions():
    """
    استيراد أسئلة من نص مادة/درس (بدون التعامل مع الملفات حالياً).
    يستخدم نفس منطق /api/ai/generate-quiz لكنه موجه للمعلم.
    body المتوقع:
    {
      "material": "...",
      "text": "...",
      "difficulty": "easy|medium|hard",
      "count": 10,
      "save": true/false
    }
    """
    body = request.get_json(force=True, silent=True) or {}

    material = (body.get("material") or body.get("subject") or "General").strip()
    lesson_text = (body.get("text") or body.get("lesson_text") or "").strip()
    difficulty = (body.get("difficulty") or "medium").strip().lower()
    count = int(body.get("count") or body.get("num_questions") or 5)
    count = max(1, min(count, 30))

    save_flag = body.get("save", True)
    if isinstance(save_flag, str):
        save_flag = save_flag.strip().lower() not in ("0", "false", "no")

    if not lesson_text:
        return jsonify({"ok": False, "error": "text is required"}), 400

    prompt = build_lesson_prompt(material, lesson_text, difficulty, count)

    used_source = "fallback"
    try:
        payload = try_ollama_generate(prompt)
        questions = normalize_questions(payload)
        if not questions:
            raise ValueError("No questions returned")
        used_source = "ollama"
    except Exception:
        questions = normalize_questions(
            fallback_questions(material, "From import", difficulty, count)
        )

    # ✅ حفظ بنك الأسئلة (ملاحظة: الأفضل تمرير teacher_id هنا لاحقًا)
    saved_ids = []
    if save_flag:
        try:
            saved_ids = save_questions(material, "From import", difficulty, questions, used_source)
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
