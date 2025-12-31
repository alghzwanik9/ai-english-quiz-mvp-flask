# Backend (Flask)

## Run
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

Health check:
http://127.0.0.1:5000/health

## Real LLaMA (Ollama) mode (optional)
If you have Ollama running locally:

```bash
set USE_OLLAMA=1
set OLLAMA_MODEL=llama3.1
python app.py
```

If Ollama isn't available, the backend falls back to mock generation so the demo always works.
