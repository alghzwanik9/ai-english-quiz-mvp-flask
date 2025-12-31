import React from "react";
import { Navigate } from "react-router-dom";
import { getSessionUser } from "../lib/storage";

export default function RequireAuth({ role, children }) {
  const user = getSessionUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}
