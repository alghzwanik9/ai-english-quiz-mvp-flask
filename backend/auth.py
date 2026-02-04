# auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User

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
        return jsonify({"error": "name, email, password are required"}), 400

    if role not in ("student", "teacher", "admin"):
        role = "student"

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    u = User(name=name, email=email, role=role)
    u.password_hash = generate_password_hash(password)

    db.session.add(u)
    db.session.commit()

    # نخلي identity بسيط (id فقط) والـ role نحطه claims
    token = create_access_token(
    identity=str(u.id),
    additional_claims={"role": u.role}
)


    return jsonify({
        "message": "registered",
        "access_token": token,
        "user": user_payload(u)
    }), 201

@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    u = User.query.filter_by(email=email).first()
    if not u or not check_password_hash(u.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(
    identity=str(u.id),
    additional_claims={"role": u.role}
)


    return jsonify({
        "message": "logged_in",
        "access_token": token,
        "user": user_payload(u)
    }), 200

@bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()  # يرجع string
    u = User.query.get(int(user_id))
    if not u:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user_payload(u)), 200
