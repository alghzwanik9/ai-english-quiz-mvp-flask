# backend/app.py
import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from models import db, User
from auth import bp as auth_bp
from routers.student import student_bp

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


def seed_demo_users() -> None:
    t_email = "teacher1@test.com"
    t = User.query.filter_by(email=t_email).first()
    if not t:
        t = User(name="Teacher 1", email=t_email, role="teacher")
        t.set_password("1234")
        db.session.add(t)

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

    # ======================
    # CORS (صح + واحد فقط)
    # ======================
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:5174", "http://127.0.0.1:5174"
        ]}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # ======================
    # Config
    # ======================
    db_url = os.getenv("DATABASE_URL") or "sqlite:///app.db"
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY", "dev-secret-change-me"
    )
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)

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
    app.register_blueprint(student_bp)

    if bp_teacher:
        app.register_blueprint(bp_teacher)
    if bp_ai:
        app.register_blueprint(bp_ai)
    if bp_ai_health:
        app.register_blueprint(bp_ai_health)

    # ======================
    # Dev init
    # ======================
    with app.app_context():
        db.create_all()
        seed_demo_users()

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
