// frontend/src/services/authService.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const SESSION_KEY = "session_user";
const LEGACY_KEYS = { token: "token", user: "user", role: "role" };

function safeJsonParse(raw, fallback = null) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function pickToken(data) {
  return (
    data?.access_token ||
    data?.token ||
    data?.accessToken ||
    data?.jwt ||
    null
  );
}

function readSession() {
  return safeJsonParse(localStorage.getItem(SESSION_KEY), null);
}

function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearLegacy() {
  localStorage.removeItem(LEGACY_KEYS.token);
  localStorage.removeItem(LEGACY_KEYS.user);
  localStorage.removeItem(LEGACY_KEYS.role);
}

function migrateLegacyIfNeeded() {
  const current = readSession();
  if (current?.token) return;

  const legacyToken = localStorage.getItem(LEGACY_KEYS.token);
  const legacyUser = safeJsonParse(localStorage.getItem(LEGACY_KEYS.user), null);
  const legacyRole = localStorage.getItem(LEGACY_KEYS.role) || legacyUser?.role || null;

  if (legacyToken && legacyToken !== "undefined" && legacyToken !== "null") {
    writeSession({ token: legacyToken, user: legacyUser, role: legacyRole });
    clearLegacy();
  }
}

function persistAuth(data) {
  const token = pickToken(data);
  const user = data?.user || null;
  const role = data?.role || user?.role || null;

  if (!token) throw new Error("Login succeeded but token is missing in response");

  writeSession({ token, user, role });
  clearLegacy();
  return { token, user, role };
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Login failed");

  persistAuth(data);
  return data.user;
}

export async function register({ name, email, password, role = "student" }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Register failed");

  persistAuth(data);
  return data.user;
}

export function logout() {
  // امسح الجلسة الحالية
  localStorage.removeItem(SESSION_KEY);

  // امسح أي بيانات قديمة
  clearLegacy();

  // (اختياري لكن مفيد)
  return true;
}


export function getToken() {
  migrateLegacyIfNeeded();
  const session = readSession();
  return session?.token || null;
}



export function getUser() {
  migrateLegacyIfNeeded();
  return readSession()?.user || null;
}

export function getRole() {
  migrateLegacyIfNeeded();
  return readSession()?.role || readSession()?.user?.role || null;
}
