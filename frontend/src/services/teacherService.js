import { getToken } from "./authService";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchTeacherTests() {
  const res = await fetch(`${API_BASE}/api/teacher/tests`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.message || "Failed to load tests");
  }
  return data.items || [];
}

export async function fetchTeacherTestById(id) {
  const res = await fetch(`${API_BASE}/api/teacher/tests/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.message || "Failed to load test");
  }
  return data.item;
}

export async function createTeacherTest({ name, subject, difficulty, questions }) {
  const res = await fetch(`${API_BASE}/api/teacher/tests`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, subject, difficulty, questions }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.message || "Failed to create test");
  }
  return data.item;
}

export async function importQuestionsWithAI({ material, text, difficulty, count, save = false }) {
  const res = await fetch(`${API_BASE}/api/teacher/import-questions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      material,
      text,
      difficulty,
      count,
      save,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.message || "Failed to import questions");
  }
  return data;
}

