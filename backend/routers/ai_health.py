from flask import Blueprint, jsonify
from services.ollama_client import (
    OLLAMA_MODEL, USE_OLLAMA, OLLAMA_URL, OLLAMA_BASE_URL, ollama_health
)

bp_ai_health = Blueprint("ai_health", __name__, url_prefix="/api/ai")

@bp_ai_health.get("/health")
def ai_health():
    ok = ollama_health() if USE_OLLAMA else False
    return jsonify({
        "status": "ok",
        "use_ollama": USE_OLLAMA,
        "ollama_ok": ok,
        "ollama_base_url": OLLAMA_BASE_URL,
        "ollama_url": OLLAMA_URL,
        "model": OLLAMA_MODEL
    })
