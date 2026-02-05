import { getToken } from "./authService";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchStudentTests() {
  const res = await fetch(`${API_BASE}/api/student/tests`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.message || "Failed to load tests");
  }
  return data.items || [];
}

export async function fetchStudentTestById(id) {
  const res = await fetch(`${API_BASE}/api/student/tests/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.message || "Failed to load test");
  }
  return data.item;
}

