// src/layout/AppShell.jsx
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { getUser, logout } from "../services/authService";

export default function AppShell({
  title,
  role = "teacher",
  active,
  onNavigate,
  navItems = [],
  onSwitchRole,
  children,
}) {
  const nav = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  const currentRole = user?.role || role;

  return (
    <div className="app-bg text-slate-900 min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="font-bold text-lg">{title}</div>
            {user && (
              <div className="text-xs text-slate-500">
                {user.name} •{" "}
                <span className="font-semibold">{currentRole}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* مثال بسيط لإظهار الدور */}
            {!user && (
              <div className="text-sm text-slate-500">
                Role: <span className="font-semibold">{currentRole}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Nav (اختياري) */}
        {Array.isArray(navItems) && navItems.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {navItems.map((it) => (
              <button
                key={it.key}
                onClick={() => onNavigate?.(it.key)}
                className={
                  "rounded-xl px-3 py-2 border text-sm " +
                  (active === it.key
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white border-slate-200 text-slate-700")
                }
              >
                {it.label}
              </button>
            ))}
          </div>
        )}

        {/* Page content */}
        <div>
          {/* نفضّل Outlet لدعم الراوتينغ المتداخل، مع fallback للـ children لو انمرّر صراحة */}
          {children ? children : <Outlet />}
        </div>
      </div>
    </div>
  );
}
