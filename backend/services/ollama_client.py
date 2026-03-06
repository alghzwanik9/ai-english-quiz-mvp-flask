import os
import json
import requests

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_URL = os.getenv("OLLAMA_URL", f"{OLLAMA_BASE_URL}/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct-q4_K_M")

USE_OLLAMA = os.getenv("USE_OLLAMA", "1") == "1"

OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
OLLAMA_TOP_P = float(os.getenv("OLLAMA_TOP_P", "0.95"))
OLLAMA_REPEAT_PENALTY = float(os.getenv("OLLAMA_REPEAT_PENALTY", "1.15"))
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "180"))

def ollama_health(timeout_sec: int = 3) -> bool:
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=timeout_sec)
        return r.status_code == 200
    except Exception:
        return False

def generate_json(prompt: str, timeout_sec: int = None) -> dict | list:
    if not USE_OLLAMA:
        raise RuntimeError("Ollama disabled via USE_OLLAMA=0")

    if timeout_sec is None:
        timeout_sec = OLLAMA_TIMEOUT

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": OLLAMA_TEMPERATURE,
            "top_p": OLLAMA_TOP_P,
            "repeat_penalty": OLLAMA_REPEAT_PENALTY,
        },
    }

    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=timeout_sec)
        r.raise_for_status()
        
        text = (r.json().get("response") or "").strip()
        if not text:
            raise ValueError("Empty response from Ollama")
        
        return json.loads(text)
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Ollama request failed: {str(e)}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON from Ollama: {str(e)}\nRaw output was: {text}")

def generate_questions(material: str, topic: str, difficulty: str, count: int) -> list:
    prompt = f"""
Generate {count} multiple choice questions.
Material: {material}
Topic: {topic}
Difficulty: {difficulty}

Return ONLY valid JSON with the following exact schema. Do not add markdown or extra text outside the JSON.
{{
  "questions": [
    {{
      "qtype": "mcq",
      "question": "...",
      "choices": ["...","...","...","..."],
      "answer": "...",
      "explanation": "..."
    }}
  ]
}}

The "answer" MUST be the exact text of one of the choices.
Ensure there are exactly 4 choices per question.
"""
    
    data = generate_json(prompt)
    if isinstance(data, dict):
        qs = data.get("questions", [])
    elif isinstance(data, list):
        qs = data
    else:
        qs = []
        
    cleaned = []
    for q in qs:
        if not isinstance(q, dict):
            continue

        question_text = (q.get("question") or "").strip()
        choices = q.get("choices") or []
        if not isinstance(choices, list):
            choices = []
        choices = [str(c).strip() for c in choices if str(c).strip()]
        
        while len(choices) < 4:
            choices.append(f"Option {len(choices)+1}")
        choices = choices[:4]

        raw_answer = str(q.get("answer") or "").strip()
        answer_text = raw_answer
        
        if raw_answer.isdigit() and choices:
            n = int(raw_answer)
            if 1 <= n <= len(choices):
                answer_text = choices[n - 1]
            elif 0 <= n < len(choices):
                answer_text = choices[n]

        if choices and answer_text and answer_text not in choices:
            if answer_text in {"A", "B", "C", "D"}:
                idx = {"A": 0, "B": 1, "C": 2, "D": 3}[answer_text]
                answer_text = choices[idx]
            else:
                answer_text = choices[0] # Fallback if model hallucinates answer

        cleaned.append({
            "qtype": "mcq",
            "question": question_text,
            "choices": choices,
            "answer": answer_text.strip(),
            "explanation": (q.get("explanation") or "").strip() or None,
        })

    return cleaned

