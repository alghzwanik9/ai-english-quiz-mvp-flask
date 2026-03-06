from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import time
import secrets
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    role = db.Column(db.String(20), nullable=False, default="student")  # teacher | student

    # رابط دعوة خاص بالمعلم
    invite_token = db.Column(db.String(64), unique=True, index=True)

    # ربط الطالب بمعلمه
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, pw: str):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw: str) -> bool:
        return check_password_hash(self.password_hash, pw)


class Test(db.Model):
    __tablename__ = "tests"
    id = db.Column(db.Integer, primary_key=True)

    # أهم سطر بالعزل
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    name = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    difficulty = db.Column(db.String(20), default="easy")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # رابط/توكن مشاركة للطلاب
    public_token = db.Column(
        db.String(64),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: secrets.token_urlsafe(24),
    )

    questions = db.relationship("Question", backref="test", cascade="all, delete-orphan")
    ai_links = db.relationship("TestAiQuestion", cascade="all, delete-orphan")


class Attempt(db.Model):
    __tablename__ = "attempts"
    id = db.Column(db.Integer, primary_key=True)

    test_id = db.Column(db.Integer, db.ForeignKey("tests.id"), nullable=False, index=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # بيانات بسيطة عن الطالب (بدون حساب)
    student_name = db.Column(db.String(120))
    student_email = db.Column(db.String(160))

    score = db.Column(db.Integer, nullable=False, default=0)
    total = db.Column(db.Integer, nullable=False, default=0)
    percent = db.Column(db.Integer, nullable=False, default=0)

    answers_json = db.Column(db.Text)  # اختياري
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)


class Question(db.Model):
    __tablename__ = "questions"
    id = db.Column(db.Integer, primary_key=True)

    test_id = db.Column(db.Integer, db.ForeignKey("tests.id"), nullable=False, index=True)

    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.String(300), nullable=False)
    explanation = db.Column(db.Text)

    choices = db.relationship("Choice", backref="question", cascade="all, delete-orphan")


class Choice(db.Model):
    __tablename__ = "choices"
    id = db.Column(db.Integer, primary_key=True)

    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False, index=True)
    choice_text = db.Column(db.String(400), nullable=False)


class AiQuestion(db.Model):
    __tablename__ = "ai_questions"
    id = db.Column(db.Integer, primary_key=True)

    # مالك السؤال (معلم أو طالب)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)

    material = db.Column(db.String(200), nullable=False)
    topic = db.Column(db.String(200))
    difficulty = db.Column(db.String(20))
    qtype = db.Column(db.String(30), nullable=False)

    question = db.Column(db.Text, nullable=False)
    choices_json = db.Column(db.Text)
    answer = db.Column(db.String(300), nullable=False)
    explanation = db.Column(db.Text)

    source = db.Column(db.String(50), nullable=False)

    # مطابق لقاعدة البيانات الحالية (integer epoch)
    created_at = db.Column(db.Integer, nullable=False)
    test_links = db.relationship("TestAiQuestion", cascade="all, delete-orphan")

class TestAiQuestion(db.Model):
    __tablename__ = "test_ai_questions"

    id = db.Column(db.Integer, primary_key=True)

    test_id = db.Column(
        db.Integer,
        db.ForeignKey("tests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    ai_question_id = db.Column(
        db.Integer,
        db.ForeignKey("ai_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        db.UniqueConstraint("test_id", "ai_question_id", name="uq_test_ai_question"),
        db.Index("idx_test_ai_questions_test_id", "test_id"),
        db.Index("idx_test_ai_questions_ai_question_id", "ai_question_id"),
    )

class TestAttempt(db.Model):
    __tablename__ = "test_attempts"

    id = db.Column(db.Integer, primary_key=True)
    test_id = db.Column(db.Integer, db.ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    answers_json = db.Column(db.Text, nullable=False)  # {"12":"Math","13":"..."}
    score = db.Column(db.Integer, nullable=False, default=0)
    total = db.Column(db.Integer, nullable=False, default=0)
    percent = db.Column(db.Float, nullable=False, default=0.0)

    created_at = db.Column(db.Integer, nullable=False, default=lambda: int(time.time()))

    __table_args__ = (
        db.Index("idx_attempts_test_id", "test_id"),
        db.Index("idx_attempts_student_id", "student_id"),
    )
