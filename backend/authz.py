# backend/authz.py
from __future__ import annotations

from functools import wraps
from typing import Callable, Any

from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User


def teacher_required(fn: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()

        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"ok": False, "error": "Invalid user"}), 401

        if user.role != "teacher":
            return jsonify({"ok": False, "error": "Teacher only"}), 403

        return fn(*args, **kwargs)

    return wrapper
