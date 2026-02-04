from flask import Blueprint, jsonify
from authz import teacher_required

bp_teacher = Blueprint("teacher", __name__, url_prefix="/api/teacher")

@bp_teacher.get("/dashboard")
@teacher_required
def dashboard():
    return jsonify({"ok": True, "msg": "Teacher dashboard"})
