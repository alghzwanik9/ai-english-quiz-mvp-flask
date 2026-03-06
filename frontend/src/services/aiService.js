const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function aiGenerateQuestions({ material, topic, difficulty="medium", count=5 }) {
  const res = await fetch(`${API_BASE}/api/ai/generate-questions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ material, topic, difficulty, count }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.details || data?.error || "AI generation failed");
  }
  return data;
}
