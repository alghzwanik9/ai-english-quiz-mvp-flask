const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function pickToken(data) {
  return (
    data?.access_token ||
    data?.token ||
    data?.accessToken ||
    data?.jwt ||
    null
  );
}

function persistAuth(data) {
  const token = pickToken(data);
  const user = data?.user || null;
  const role = data?.role || user?.role || null;

  if (!token) throw new Error("Login succeeded but token is missing in response");

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  if (role) localStorage.setItem("role", role);

  return { token, user, role };
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Login failed");
  }

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

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Register failed");
  }

  persistAuth(data);
  return data.user;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

export function getToken() {
  const t = localStorage.getItem("token");
  // حماية ضد "undefined" و "null" كنص
  if (!t || t === "undefined" || t === "null") return null;
  return t;
}

export function getUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRole() {
  return localStorage.getItem("role") || getUser()?.role || null;
}
