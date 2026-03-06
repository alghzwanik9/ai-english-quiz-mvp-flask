# auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from werkzeug.security import generate_password_hash
from models import db, User
import secrets

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def user_payload(u: User):
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role}


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "student").strip().lower()

    if not name or not email or not password:
        return jsonify({"ok": False, "error": "name_email_password_required"}), 400

    if role not in ("student", "teacher", "admin"):
        role = "student"

    if User.query.filter_by(email=email).first():
        return jsonify({"ok": False, "error": "email_exists"}), 409

    u = User(name=name, email=email, role=role)
    u.password_hash = generate_password_hash(password)

    # ✅ لو معلم، أنشئ invite_token
    if role == "teacher":
        u.invite_token = secrets.token_urlsafe(24)

    db.session.add(u)
    db.session.commit()

    # identity = id (string) + claims فيها role/email
    token = create_access_token(
        identity=str(u.id),
        additional_claims={"role": u.role, "email": u.email},
    )

    return jsonify(
        {
            "ok": True,
            "token": token,
            "access_token": token,  # ✅ alias للتوافق لو في كود قديم
            "user": user_payload(u),
        }
    ), 201


@bp.post("/login")
def login():
    """
    Expected body: {"email":"...", "password":"..."}
    Returns: { ok, token, user: {id,name,email,role} }
    """
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return jsonify({"ok": False, "error": "email_and_password_required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"ok": False, "error": "invalid_credentials"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )

    return jsonify(
        {
            "ok": True,
            "token": token,
            "access_token": token,  # ✅ alias للتوافق
            "user": user_payload(user),
        }
    )


@bp.get("/me")
@jwt_required()
def me():
    """
    Debug endpoint to verify token + role quickly.
    """
    uid = get_jwt_identity()
    claims = get_jwt() or {}
    return jsonify(
        {
            "ok": True,
            "user_id": uid,
            "role": claims.get("role"),
            "email": claims.get("email"),
        }
    )
