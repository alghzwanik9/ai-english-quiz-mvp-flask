from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func, distinct
import json
import time

from authz import teacher_required
from models import db, User, Test, Question, Choice, TestAttempt, AiQuestion, TestAiQuestion

from routers.ai import (
    build_lesson_prompt,
    try_ollama_generate,
    normalize_questions,
)

bp_teacher = Blueprint("teacher", __name__, url_prefix="/api/teacher")


def serialize_test(test: Test, include_questions: bool = True):
    data = {
        "id": test.id,
        "name": test.name,
        "subject": test.subject,
        "difficulty": test.difficulty,
        "created_at": test.created_at.isoformat() if test.created_at else None,
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
                    "answer": q.answer,
                    "explanation": q.explanation or "",
                }
            )
        data["questions"] = items
        data["q"] = len(items)

    return data


def _teacher_id():
    return int(get_jwt_identity())


def _fmt_created_at(v):
    # TestAttempt.created_at عندك integer epoch
    return v


@bp_teacher.get("/stats")
@teacher_required
def teacher_stats():
    teacher_id = _teacher_id()

    # 1) عدد الاختبارات
    total_tests = (
        db.session.query(func.count(Test.id))
        .filter(Test.teacher_id == teacher_id)
        .scalar()
        or 0
    )

    # 2) عدد المحاولات (كل محاولات طلاب هذا المعلم)
    total_attempts = (
        db.session.query(func.count(TestAttempt.id))
        .join(Test, Test.id == TestAttempt.test_id)
        .filter(Test.teacher_id == teacher_id)
        .scalar()
        or 0
    )

    # 3) متوسط النسبة
    avg_percent = (
        db.session.query(func.avg(TestAttempt.percent))
        .join(Test, Test.id == TestAttempt.test_id)
        .filter(Test.teacher_id == teacher_id)
        .scalar()
    )
    avg_percent = round(float(avg_percent), 1) if avg_percent else 0

    # 4) عدد الطلاب النشطين (طلاب مختلفين لهم محاولات)
    active_students = (
        db.session.query(func.count(distinct(TestAttempt.student_id)))
        .join(Test, Test.id == TestAttempt.test_id)
        .filter(Test.teacher_id == teacher_id)
        .scalar()
        or 0
    )

    return jsonify({
        "ok": True,
        "total_tests": total_tests,
        "total_attempts": total_attempts,
        "avg_percent": avg_percent,
        "active_students": active_students,
    })

@bp_teacher.get("/tests/<int:test_id>/results")
@teacher_required
def test_results(test_id: int):
    teacher_id = _teacher_id()

    test = Test.query.filter_by(id=test_id, teacher_id=teacher_id).first_or_404()

    # ✅ نتائج من test_attempts (الجديد)
    rows = (
        db.session.query(TestAttempt, User)
        .join(User, User.id == TestAttempt.student_id)
        .filter(TestAttempt.test_id == test.id)
        .order_by(TestAttempt.id.desc())
        .all()
    )

    items = []
    for att, stu in rows:
        items.append({
            "id": att.id,
            "student_name": getattr(stu, "name", "") or "",
            "student_email": getattr(stu, "email", "") or "",
            "score": att.score,
            "total": att.total,
            "percent": att.percent,
            "created_at": _fmt_created_at(att.created_at),
        })

    return jsonify({"ok": True, "test": {"id": test.id, "name": test.name}, "items": items})


@bp_teacher.get("/results")
@teacher_required
def teacher_results():
    teacher_id = _teacher_id()

    # ✅ كل محاولات طلاب المعلم على اختبارات المعلم
    rows = (
        db.session.query(TestAttempt, User, Test)
        .join(Test, Test.id == TestAttempt.test_id)
        .join(User, User.id == TestAttempt.student_id)
        .filter(Test.teacher_id == teacher_id)
        .order_by(TestAttempt.id.desc())
        .limit(500)
        .all()
    )

    items = []
    for att, stu, test in rows:
        items.append({
            "id": att.id,
            "test_id": test.id,
            "test_name": test.name,
            "student_name": getattr(stu, "name", "") or "",
            "student_email": getattr(stu, "email", "") or "",
            "score": att.score,
            "total": att.total,
            "percent": att.percent,
            "created_at": _fmt_created_at(att.created_at),
        })

    return jsonify({"ok": True, "items": items})


@bp_teacher.get("/tests")
@teacher_required
def list_tests():
    teacher_id = _teacher_id()

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
    teacher_id = _teacher_id()

    test = (
        Test.query
        .filter_by(id=test_id, teacher_id=teacher_id)
        .first_or_404()
    )

    return jsonify({"ok": True, "item": serialize_test(test, include_questions=True)})


@bp_teacher.post("/tests")
@teacher_required
def create_test():
    body = request.get_json(silent=True) or {}

    name = (body.get("name") or "").strip()
    subject = (body.get("subject") or "").strip() or "General"
    difficulty = (body.get("difficulty") or "easy").strip().lower()
    questions = body.get("questions") or []

    if not name:
        return jsonify({"ok": False, "error": "name is required"}), 400

    if not isinstance(questions, list):
        return jsonify({"ok": False, "error": "questions must be a list"}), 400

    teacher_id = _teacher_id()

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

    return jsonify({
        "ok": True,
        "item": serialize_test(test, include_questions=True),
        "share_token": test.public_token
    }), 201


@bp_teacher.post("/import-questions")
@teacher_required
def import_questions():
    """
    يولّد أسئلة بالـ AI ويحفظها في DB ويرجعها للمعلم.
    """
    body = request.get_json(force=True, silent=True) or {}

    material = (body.get("material") or body.get("subject") or "General").strip()
    lesson_text = (body.get("text") or body.get("lesson_text") or "").strip()
    difficulty = (body.get("difficulty") or "medium").strip().lower()
    count = int(body.get("count") or body.get("num_questions") or 5)
    count = max(1, min(count, 30))

    if not lesson_text:
        return jsonify({"ok": False, "error": "text is required"}), 400

    prompt = build_lesson_prompt(material, lesson_text, difficulty, count)

    try:
        payload = try_ollama_generate(prompt)
        questions = normalize_questions(payload)
        if not questions:
            return jsonify({"ok": False, "error": "No questions returned from AI"}), 502
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": "AI generation failed (Ollama).",
            "details": str(e),
        }), 503

    # ✅ حفظ الأسئلة في ai_questions
    teacher_id = _teacher_id()
    now = int(time.time())
    saved_ids = []
    for q in questions:
        row = AiQuestion(
            created_by_user_id=teacher_id,
            material=material,
            topic="From lesson text",
            difficulty=difficulty,
            qtype=q.get("qtype", "mcq"),
            question=q["question"],
            choices_json=json.dumps(q.get("choices", []), ensure_ascii=False),
            answer=q["answer"],
            explanation=q.get("explanation", ""),
            source="ollama",
            created_at=now,
        )
        db.session.add(row)
        db.session.flush()
        saved_ids.append(row.id)

    db.session.commit()

    return jsonify({
        "ok": True,
        "source": "ollama",
        "saved_ids": saved_ids,
        "questions": questions,
    })


@bp_teacher.post("/tests/<int:test_id>/ai-questions")
@teacher_required
def link_ai_questions_to_test(test_id: int):
    """
    ربط أسئلة AI (من ai_questions) باختبار معيّن.
    Body: { "ai_question_ids": [1, 2, 3] }
    """
    teacher_id = _teacher_id()

    test = Test.query.filter_by(id=test_id, teacher_id=teacher_id).first_or_404()

    body = request.get_json(silent=True) or {}
    ids = body.get("ai_question_ids") or []

    if not isinstance(ids, list) or not ids:
        return jsonify({"ok": False, "error": "ai_question_ids must be a non-empty list"}), 400

    linked = []
    skipped = []
    for ai_id in ids:
        # تأكد السؤال موجود
        aq = db.session.get(AiQuestion, ai_id)
        if not aq:
            skipped.append(ai_id)
            continue

        # تجنب التكرار (UNIQUE constraint)
        exists = TestAiQuestion.query.filter_by(
            test_id=test.id, ai_question_id=ai_id
        ).first()
        if exists:
            skipped.append(ai_id)
            continue

        link = TestAiQuestion(test_id=test.id, ai_question_id=ai_id)
        db.session.add(link)
        linked.append(ai_id)

    db.session.commit()

    return jsonify({
        "ok": True,
        "linked": linked,
        "skipped": skipped,
        "test_id": test.id,
    })
