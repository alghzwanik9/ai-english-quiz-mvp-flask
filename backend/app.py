import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from models import db, User
from auth import bp as auth_bp  # backend/auth.py

# Optional blueprints
try:
    from routers.teacher import bp_teacher
except Exception:
    bp_teacher = None

try:
    from routers.ai import bp_ai
except Exception:
    bp_ai = None

try:
    from routers.ai_health import bp_ai_health
except Exception:
    bp_ai_health = None

try:
    from routers.student import bp_student
except Exception:
    bp_student = None


def seed_demo_users() -> None:
    # Teacher demo
    t_email = "teacher1@test.com"
    t = User.query.filter_by(email=t_email).first()
    if not t:
        t = User(name="Teacher 1", email=t_email, role="teacher")
        t.set_password("1234")
        db.session.add(t)

    # Student demo
    s_email = "student1@test.com"
    s = User.query.filter_by(email=s_email).first()
    if not s:
        s = User(name="Student 1", email=s_email, role="student")
        s.set_password("1234")
        db.session.add(s)

    db.session.commit()


def create_app() -> Flask:
    load_dotenv()

    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ======================
    # Config
    # ======================
    # لو DATABASE_URL موجود استخدمه، وإلا استخدم SQLite محلي (للتطوير)
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        # يطلع ملف app.db داخل مجلد backend
        db_url = "sqlite:///app.db"

    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")

    # ======================
    # Extensions
    # ======================
    db.init_app(app)
    Migrate(app, db)
    JWTManager(app)

    # ======================
    # Blueprints
    # ======================
    app.register_blueprint(auth_bp)

    if bp_teacher is not None:
        app.register_blueprint(bp_teacher)

    if bp_ai is not None:
        app.register_blueprint(bp_ai)

    if bp_ai_health is not None:
        app.register_blueprint(bp_ai_health)

    if bp_student is not None:
        app.register_blueprint(bp_student)

    # ======================
    # Dev init (create tables + seed demo users)
    # ======================
    with app.app_context():
        db.create_all()
        seed_demo_users()

    # ======================
    # Simple health
    # ======================
    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
