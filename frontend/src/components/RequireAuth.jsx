// frontend/src/components/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken, getUser } from "../services/authService";

export default function RequireAuth({ role, children }) {
  const location = useLocation();

  const token = getToken();
  const user = getUser();
  const userRole = user?.role;

  // ✅ لازم token + role (مو بس user)
  if (!token || !userRole) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // تحقق الدور لو مطلوب
  if (role && userRole !== role) {
    return <Navigate to={userRole === "teacher" ? "/teacher" : "/student"} replace />;
  }

  return children;
}
