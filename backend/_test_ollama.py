from services.ollama_client import generate_questions

generated = generate_questions("English", "Present simple", "easy", 2)
print(type(generated), len(generated))
print(generated[0] if generated else None)
