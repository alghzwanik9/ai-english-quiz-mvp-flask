# backend/routers/student.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import json

from models import db, User, Test, AiQuestion, TestAiQuestion, TestAttempt

student_bp = Blueprint("student", __name__, url_prefix="/api/student")


# -------------------------
# helpers
# -------------------------
def _iso(dt):
    return dt.isoformat() if dt else None


def _norm(x):
    return (x or "").strip().lower()


def _current_student():
    try:
        student_id = int(get_jwt_identity())
    except Exception:
        return None, (jsonify({"ok": False, "error": "invalid_jwt_identity"}), 401)

    student = db.session.get(User, student_id)
    if not student:
        return None, (jsonify({"ok": False, "error": "user_not_found"}), 404)

    if getattr(student, "role", None) != "student":
        return None, (jsonify({"ok": False, "error": "forbidden"}), 403)

    return student, None


def _safe_load_list(raw):
    """Always returns list."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return []
        try:
            v = json.loads(s)
            return v if isinstance(v, list) else []
        except Exception:
            return []
    return []


def _choice_text(c):
    val = (
        getattr(c, "choice_text", None)
        or getattr(c, "text", None)
        or getattr(c, "value", None)
        or getattr(c, "content", None)
        or getattr(c, "label", None)
        or getattr(c, "name", None)
        or getattr(c, "title", None)
    )
    return (str(val).strip() if val is not None else "")


def _question_to_dict(q):
    prompt = (
        getattr(q, "question", None)
        or getattr(q, "text", None)
        or getattr(q, "prompt", None)
        or ""
    )

    # 1) علاقة choices (لو موجودة)
    choices_rel = getattr(q, "choices", None)
    if choices_rel is not None:
        try:
            choices_list = [_choice_text(c) for c in (choices_rel or [])]
        except Exception:
            choices_list = []
    else:
        # 2) choices_json (لو نص JSON)
        choices_list = _safe_load_list(getattr(q, "choices_json", None))

    choices_list = [str(c).strip() for c in choices_list if str(c).strip()]

    return {
        "id": getattr(q, "id", None),
        "question": str(prompt).strip(),
        "choices": choices_list,
        "qtype": getattr(q, "qtype", "mcq") or "mcq",
        "source": "manual",
        "answer": getattr(q, "answer", None),
        "explanation": getattr(q, "explanation", "") or "",
    }


def _ai_question_to_dict(aq: AiQuestion):
    choices = _safe_load_list(getattr(aq, "choices_json", None))
    choices = [str(c).strip() for c in choices if str(c).strip()]

    return {
        "id": aq.id,
        "question": (aq.question or "").strip(),
        "choices": choices,
        "qtype": aq.qtype or "mcq",
        "source": "ai",
        "answer": aq.answer,
        "explanation": aq.explanation or "",
    }


def _check_test_access(student, test):
    """
    ✅ إصلاح: التحقق الصحيح من صلاحية الطالب على الاختبار.
    يجب أن يكون الطالب مرتبطاً بمعلم، والاختبار من نفس المعلم.
    """
    if not getattr(student, "teacher_id", None):
        return False, (jsonify({"ok": False, "error": "not_linked_to_teacher"}), 403)

    if not getattr(test, "teacher_id", None):
        return False, (jsonify({"ok": False, "error": "test_not_found"}), 404)

    if student.teacher_id != test.teacher_id:
        return False, (jsonify({"ok": False, "error": "test_not_assigned"}), 403)

    return True, None


# -------------------------
# routes
# -------------------------
@student_bp.post("/join/<string:invite_token>")
@jwt_required()
def join_teacher(invite_token):
    student, err = _current_student()
    if err:
        return err

    if getattr(student, "teacher_id", None):
        return jsonify({"ok": False, "error": "already_linked"}), 400

    teacher = User.query.filter_by(invite_token=invite_token, role="teacher").first()
    if not teacher:
        return jsonify({"ok": False, "error": "invalid_invite_token"}), 404

    student.teacher_id = teacher.id
    db.session.commit()

    return jsonify({
        "ok": True,
        "teacher": {"id": teacher.id, "name": teacher.name}
    }), 200


@student_bp.get("/tests")
@jwt_required()
def get_student_tests():
    student, err = _current_student()
    if err:
        return err

    if not getattr(student, "teacher_id", None):
        return jsonify({"ok": True, "tests": []}), 200

    tests = (
        Test.query
        .filter_by(teacher_id=student.teacher_id)
        .order_by(Test.created_at.desc())
        .all()
    )

    return jsonify({
        "ok": True,
        "tests": [
            {
                "id": t.id,
                "name": getattr(t, "name", None),
                "subject": getattr(t, "subject", None),
                "difficulty": getattr(t, "difficulty", None),
                "created_at": _iso(getattr(t, "created_at", None)),
            }
            for t in tests
        ]
    }), 200


@student_bp.get("/tests/<int:test_id>")
@jwt_required()
def get_student_test_by_id(test_id):
    student, err = _current_student()
    if err:
        return err

    test = db.session.get(Test, test_id)
    if not test:
        return jsonify({"ok": False, "error": "test_not_found"}), 404

    # ✅ إصلاح: التحقق الصارم من صلاحية الوصول
    ok, access_err = _check_test_access(student, test)
    if not ok:
        return access_err

    questions = []

    # 1) manual questions
    if hasattr(test, "questions") and test.questions:
        for q in test.questions:
            d = _question_to_dict(q)
            d["qid"] = f"m-{q.id}"
            d["id"] = q.id
            d["source"] = "manual"
            questions.append(d)

    # 2) AI questions عبر TestAiQuestion
    ai_qs = (
        db.session.query(AiQuestion)
        .join(TestAiQuestion, TestAiQuestion.ai_question_id == AiQuestion.id)
        .filter(TestAiQuestion.test_id == test.id)
        .all()
    )
    for aq in ai_qs:
        d = _ai_question_to_dict(aq)
        d["qid"] = f"a-{aq.id}"
        d["id"] = aq.id
        d["source"] = "ai"
        questions.append(d)

    return jsonify({
        "ok": True,
        "test": {
            "id": test.id,
            "name": getattr(test, "name", None),
            "subject": getattr(test, "subject", None),
            "difficulty": getattr(test, "difficulty", None),
            "created_at": _iso(getattr(test, "created_at", None)),
        },
        "questions": questions
    }), 200


@student_bp.post("/tests/<int:test_id>/submit")
@jwt_required()
def submit_test(test_id):
    student, err = _current_student()
    if err:
        return err

    test = db.session.get(Test, test_id)
    if not test:
        return jsonify(ok=False, error="test_not_found"), 404

    # ✅ إصلاح: التحقق الصارم من صلاحية الوصول
    ok, access_err = _check_test_access(student, test)
    if not ok:
        return access_err

    # ✅ منع إعادة التقديم
    existing = TestAttempt.query.filter_by(
        test_id=test_id, student_id=student.id
    ).first()
    if existing:
        return jsonify(
            ok=False,
            error="already_submitted",
            attempt_id=existing.id,
            score=existing.score,
            total=existing.total,
            percent=existing.percent,
        ), 409

    payload = request.get_json(silent=True) or {}
    answers = payload.get("answers") or {}

    # answers ممكن يجي list [{question_id: "m-12", answer: "Math"}]
    if isinstance(answers, list):
        answers = {str(a.get("question_id")): a.get("answer") for a in answers}

    if not isinstance(answers, dict):
        return jsonify(ok=False, error="Invalid answers format"), 400

    # 1) manual questions
    manual_qs = list(getattr(test, "questions", []) or [])

    # 2) ai questions via link table
    ai_qs = (
        db.session.query(AiQuestion)
        .join(TestAiQuestion, TestAiQuestion.ai_question_id == AiQuestion.id)
        .filter(TestAiQuestion.test_id == test_id)
        .all()
    )

    total = len(manual_qs) + len(ai_qs)
    if total == 0:
        return jsonify(ok=False, error="No questions found for this test"), 404

    score = 0

    # manual grading
    for q in manual_qs:
        key = f"m-{q.id}"
        student_ans = _norm(answers.get(key))
        correct_ans = _norm(getattr(q, "answer", ""))
        if student_ans and correct_ans and student_ans == correct_ans:
            score += 1

    # ai grading
    for aq in ai_qs:
        key = f"a-{aq.id}"
        student_ans = _norm(answers.get(key))
        correct_ans = _norm(getattr(aq, "answer", ""))
        if student_ans and correct_ans and student_ans == correct_ans:
            score += 1

    percent = (score / total) * 100.0

    attempt = TestAttempt(
        test_id=test_id,
        student_id=student.id,
        answers_json=json.dumps(answers, ensure_ascii=False),
        score=score,
        total=total,
        percent=percent,
    )
    db.session.add(attempt)
    db.session.commit()

    return jsonify(
        ok=True,
        attempt_id=attempt.id,
        score=score,
        total=total,
        percent=percent,
    )
