// frontend/src/components/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken, getUser } from "../services/authService";

export default function RequireAuth({ role, children }) {
  const location = useLocation();

  const token = getToken();
  const user = getUser();

  // لازم يكون فيه token + user
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // تحقق الدور لو مطلوب
  if (role && user.role !== role) {
    // لو دخل صفحة غلط حسب دوره، وجهه للصح
    return (
      <Navigate
        to={user.role === "teacher" ? "/teacher" : "/student"}
        replace
      />
    );
  }

  return children;
}
