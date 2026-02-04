import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../services/authService";

export default function RequireRole({ allow = [], children }) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (allow.length && !allow.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
