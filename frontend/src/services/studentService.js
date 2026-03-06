// frontend/src/services/studentService.js
import { getToken } from "./authService";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ربط الطالب بالمعلم (invite_token)
export async function joinTeacher(inviteToken) {
  const res = await fetch(`${API_BASE}/api/student/join/${inviteToken}`, {
    method: "POST",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || "Failed to join teacher");
  }
  return data;
}

// جلب قائمة اختبارات الطالب
export async function fetchStudentTests() {
  const res = await fetch(`${API_BASE}/api/student/tests`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to load tests");
  }

  if (Array.isArray(data)) return data;
  if (data?.ok === false) throw new Error(data?.error || data?.message || "Failed to load tests");

  return data?.items || data?.tests || [];
}

// جلب اختبار واحد بالـ id (Strict + Contract ثابت)
export async function fetchStudentTestById(id) {
  const url = `${API_BASE}/api/student/tests/${id}`;

  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`API returned non-JSON response (${res.status}). URL: ${url}`);
  }

  if (!res.ok || data?.ok === false) {
    throw new Error(
      data?.error || data?.message || `Failed to load test (HTTP ${res.status}). URL: ${url}`
    );
  }

  // ✅ backend contract: { ok, test, questions }
  const test = data?.test || null;
  const questions = Array.isArray(data?.questions) ? data.questions : [];

  if (!test) {
    throw new Error(`API missing "test" object for test ${id}. URL: ${url}`);
  }

  if (!questions.length) {
    throw new Error(`API returned 0 questions for test ${id}. URL: ${url}`);
  }

  // منع fallback
  const hasFallbackMarker = questions.some((q) => String(q?.question ?? "").includes("[Fallback"));
  if (hasFallbackMarker) {
    throw new Error(`API returned FALLBACK questions (blocked). Fix backend. URL: ${url}`);
  }

  // ✅ رجّع object موحّد للفرونت
  return { test, questions };
}

// ✅ تسليم الاختبار (Submit)
export async function submitStudentTest(testId, answers) {
  const url = `${API_BASE}/api/student/tests/${testId}/submit`;

  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ answers }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || `Failed to submit test (HTTP ${res.status})`);
  }

  return data; // { ok, attempt_id, score, total, percent }
}
