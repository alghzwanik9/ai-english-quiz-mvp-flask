import { getToken } from "./authService";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// -------------------------
// إنشاء اختبار
// -------------------------
export async function createTeacherTest(payload) {
  const res = await fetch(`${API_BASE}/api/teacher/tests`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || "Failed to create test");
  }
  return data;
}

// -------------------------
// توليد / استيراد أسئلة AI
// -------------------------
export async function importQuestionsWithAI({
  test_id = null,
  material = "General",
  topic = "",
  text = "",
  difficulty = "medium",
  count = 5,
  save = false,
} = {}) {
  const res = await fetch(`${API_BASE}/api/ai/generate-questions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      test_id,
      material,
      topic,
      text,
      difficulty,
      count,
      save,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || "Failed to generate questions");
  }

  return data;
}

// -------------------------
// جلب اختبارات المعلم
// -------------------------
export async function fetchTeacherTests() {
  const res = await fetch(`${API_BASE}/api/teacher/tests`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || "Failed to fetch tests");
  }

  return Array.isArray(data) ? data : data.items || [];
}

// -------------------------
// جلب كل النتائج (كل الاختبارات)
// -------------------------
export async function fetchTeacherResults() {
  const res = await fetch(`${API_BASE}/api/teacher/results`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || "Failed to fetch teacher results");
  }

  return data;
}

// -------------------------
// جلب نتائج اختبار محدد
// -------------------------
export async function fetchTestResults(testId) {
  const res = await fetch(`${API_BASE}/api/teacher/tests/${testId}/results`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || "Failed to fetch test results");
  }

  return data;
}
