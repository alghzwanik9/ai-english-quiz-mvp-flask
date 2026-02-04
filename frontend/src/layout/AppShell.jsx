// src/layout/AppShell.jsx
import React from "react";

export default function AppShell({
  title,
  role = "teacher",
  active,
  onNavigate,
  navItems = [],
  onSwitchRole,
  children,
}) {
  // أي حسابات/متغيرات خَلّها هنا داخل الدالة (مو برا)
  return (
    <div className="app-bg text-slate-900 min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-lg">{title}</div>

          {/* مثال بسيط لإظهار الدور */}
          <div className="text-sm text-slate-500">
            Role: <span className="font-semibold">{role}</span>
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
        <div>{children}</div>
      </div>
    </div>
  );
}
