import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSessionUser, logout } from "../lib/storage";

export default function Navbar() {
  const user = getSessionUser();
  const nav = useNavigate();

  return (
    <div className="sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-xl shadow-slate-900/5 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center">
              <span className="text-indigo-700 font-bold">AI</span>
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">AI English Quiz</div>
              <div className="text-xs text-slate-500">Teacher • Student • AI Generator</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="pill pill-active">
                  {user.role?.toUpperCase()} • {user.name}
                </span>
                <button
                  type="button"
                  className="btnx-ghost"
                  onClick={() => {
                    logout();
                    nav("/login");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="btnx-ghost" to="/login">Login</Link>
                <Link className="btnx-primary" to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
