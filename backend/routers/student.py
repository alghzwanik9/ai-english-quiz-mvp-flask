from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import json
from flask import Blueprint, jsonify, abort
from models import db, Test, Attempt
bp_student = Blueprint("student", __name__, url_prefix="/api/student")

from flask import request, jsonify

def serialize_test_for_student(test: Test):
  """
  واجهة مبسطة لاختبارات الطالب (بدون كشف الإجابات الصحيحة هنا).
  """
  return {
    "id": test.id,
    "name": test.name,
    "subject": test.subject,
    "difficulty": test.difficulty,
    "created_at": test.created_at.isoformat() if test.created_at else None,
    "q": len(test.questions or []),
  }
@bp_student.post("/tests/by-token/<token>/submit")
def submit_by_token(token: str):
    test = Test.query.filter_by(public_token=token).first()
    if not test:
        return jsonify({"ok": False, "error": "Test not found"}), 404

    body = request.get_json(silent=True) or {}
    answers = body.get("answers") or {}   # {questionId: selectedIndex}
    student_name = (body.get("student_name") or "").strip()
    student_email = (body.get("student_email") or "").strip()

    total = len(test.questions or [])
    score = 0

    # صحح بدون ما نرسل الإجابات
    for q in (test.questions or []):
        selected_idx = answers.get(str(q.id))
        if selected_idx is None:
            selected_idx = answers.get(q.id)

        try:
            selected_idx = int(selected_idx)
        except Exception:
            continue

        choices = [c.choice_text for c in (q.choices or [])]
        if 0 <= selected_idx < len(choices):
            chosen_text = choices[selected_idx]
            if chosen_text == q.answer:
                score += 1

    percent = round((score / total) * 100) if total else 0

    # ✅ احفظ محاولة
    att = Attempt(
        test_id=test.id,
        teacher_id=test.teacher_id,
        student_name=student_name or None,
        student_email=student_email or None,
        score=score,
        total=total,
        percent=percent,
        answers_json=json.dumps(answers, ensure_ascii=False),
    )
    db.session.add(att)
    db.session.commit()

    return jsonify({
        "ok": True,
        "result": {
            "attemptId": att.id,
            "testId": test.id,
            "total": total,
            "score": score,
            "percent": percent,
            "passed": percent >= 60,
        }
    })

@bp_student.get("/tests/by-token/<token>")
def get_test_by_token(token: str):
  """
  الطالب يدخل برابط/توكن الاختبار.
  نرجع الاختبار + الأسئلة (بدون الإجابات).
  """
  test = Test.query.filter_by(public_token=token).first()
  if not test:
    return jsonify({"ok": False, "error": "Test not found"}), 404

  questions = []
  for q in test.questions:
    questions.append({
      "id": q.id,
      "type": "mcq",
      "question": q.question,
      "choices": [c.choice_text for c in q.choices],
      # ❌ لا ترسل answer هنا
    })

  return jsonify({
    "ok": True,
    "item": {
      "id": test.id,
      "name": test.name,
      "subject": test.subject,
      "difficulty": test.difficulty,
      "created_at": test.created_at.isoformat() if test.created_at else None,
      "questions": questions,
    }
  })

@bp_student.get("/tests")
@jwt_required()
def list_available_tests():
  claims = get_jwt()
  if claims.get("role") != "student":
    return jsonify({"error": "Student only"}), 403

  return jsonify({
    "ok": True,
    "items": [],
    "note": "Use test link (token) to open quizzes."
  })



@bp_student.get("/tests/<int:test_id>")
@jwt_required()
def get_test_detail(test_id: int):
  """
  تفاصيل اختبار مع الأسئلة للاستخدام في TakeQuiz في الواجهة.
  (نرسل الإجابات الصحيحة لأن التصحيح يتم على الفرونت حالياً.)
  """
  claims = get_jwt()
  role = claims.get("role")
  if role != "student":
    return jsonify({"error": "Student only"}), 403

  test = Test.query.get_or_404(test_id)
  questions = []
  for q in test.questions:
    questions.append({
  "id": q.id,
  "type": "mcq",
  "question": q.question,
  "choices": [c.choice_text for c in q.choices],
})


  return jsonify(
    {
      "ok": True,
      "item": {
        "id": test.id,
        "name": test.name,
        "subject": test.subject,
        "difficulty": test.difficulty,
        "created_at": test.created_at.isoformat() if test.created_at else None,
        "questions": questions,
      },
    }
  )

