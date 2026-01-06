from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Test(db.Model):
    __tablename__ = "tests"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    difficulty = db.Column(db.String(20), default="easy")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship("Question", backref="test", cascade="all, delete-orphan")

class Question(db.Model):
    __tablename__ = "questions"
    id = db.Column(db.Integer, primary_key=True)
    test_id = db.Column(db.Integer, db.ForeignKey("tests.id"), nullable=False)

    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.String(300), nullable=False)
    explanation = db.Column(db.Text)

    choices = db.relationship("Choice", backref="question_rel", cascade="all, delete-orphan")

class Choice(db.Model):
    __tablename__ = "choices"
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False)
    choice_text = db.Column(db.String(400), nullable=False)

class AiQuestion(db.Model):
    __tablename__ = "ai_questions"

    id = db.Column(db.Integer, primary_key=True)
    material = db.Column(db.String(200), nullable=False)
    topic = db.Column(db.String(200))
    difficulty = db.Column(db.String(20))
    qtype = db.Column(db.String(30), nullable=False)

    question = db.Column(db.Text, nullable=False)
    choices_json = db.Column(db.Text)  # نخزنها JSON string
    answer = db.Column(db.String(300), nullable=False)
    explanation = db.Column(db.Text)

    source = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.Integer, nullable=False)
