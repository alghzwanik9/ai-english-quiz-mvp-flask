// frontend/src/services/http.js
import { getToken, logout } from "./authService";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // اختياري: إذا انتهى التوكن، نظّف الجلسة
  if (res.status === 401) {
    // logout();
  }

  return res;
}
