// src/lib/storage.js
// Storage layer ثابت + آمن (ما يطيّح التطبيق لو البيانات قديمة/خربانة)

const KEYS = {
  TESTS: "tests",
  RESULTS: "results",
  SESSION: "session_user",
};

// ---------- helpers ----------
function safeParse(raw, fallback) {
  try {
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function read(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

// ---------- session ----------
export function setSessionUser(user) {
  write(KEYS.SESSION, user || null);
}

export function getSessionUser() {
  return read(KEYS.SESSION, null);
}

export function clearSessionUser() {
  localStorage.removeItem(KEYS.SESSION);
}

// ---------- tests ----------
export function getTests() {
  return ensureArray(read(KEYS.TESTS, []));
}

export function setTests(tests) {
  write(KEYS.TESTS, ensureArray(tests));
}

export function addTest(test) {
  const list = getTests();
  list.unshift(test);
  setTests(list);
  return test;
}
export function upsertTest(test) {
  const list = getTests();
  const id = Number(test?.id);

  // إذا ما فيه id → اعتبره إضافة جديدة
  if (!Number.isFinite(id) || id === 0) {
    const t = { ...test, id: Date.now() };
    list.unshift(t);
    setTests(list);
    return t;
  }

  // إذا موجود → تحديث، إذا غير موجود → إضافة
  const idx = list.findIndex((t) => Number(t.id) === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...test };
  } else {
    list.unshift(test);
  }
  setTests(list);
  return test;
}

export function updateTest(testId, patch) {
  const list = getTests();
  const id = Number(testId);
  const next = list.map((t) => (Number(t.id) === id ? { ...t, ...patch } : t));
  setTests(next);
  return next.find((t) => Number(t.id) === id) || null;
}

export function deleteTest(testId) {
  const id = Number(testId);
  const next = getTests().filter((t) => Number(t.id) !== id);
  setTests(next);
  return next;
}

export function getTestById(testId) {
  const id = Number(testId);
  return getTests().find((t) => Number(t.id) === id) || null;
}

// ---------- results ----------
export function getResults() {
  // نخليها دايم Array حتى لو البيانات قديمة
  return ensureArray(read(KEYS.RESULTS, []));
}

export function setResults(results) {
  write(KEYS.RESULTS, ensureArray(results));
}

export function addResult(result) {
  const list = getResults();
  list.unshift(result);
  setResults(list);
  return result;
}

export function clearResults() {
  localStorage.removeItem(KEYS.RESULTS);
}

// أدوات مساعدة (اختياري)
export function getResultsByTestId(testId) {
  const id = Number(testId);
  return getResults().filter((r) => Number(r.testId) === id);
}

export const getAttempts = getResults;
export const setAttempts = setResults;
export const addAttempt = addResult;
export const clearAttempts = clearResults;
