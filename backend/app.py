import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from models import db
from auth import bp as auth_bp  # تأكد auth.py موجود في backend/

# Optional: teacher blueprint
try:
    from routers.teacher import bp_teacher  # backend/routers/teacher.py
except Exception:
    bp_teacher = None


def create_app():
    load_dotenv()

    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ======================
    # Config
    # ======================
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL is required (set it in .env)")

    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # flask-jwt-extended secret
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
