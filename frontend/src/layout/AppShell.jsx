import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { logout } from "../services/authService";
export default function AppShell({ title = "Learning Platform", role = "teacher" }) {
  const headerTitle = "English Learning Platform";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="app-bg min-h-screen">
      <Header
        title={headerTitle}
        onOpenSidebar={() => setSidebarOpen(true)}
        onLogout={() => {
          logout();              // يمسح الجلسة
          navigate("/login");    // يروح لصفحة الدخول
        }}
      />

      <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="relative z-0 mx-auto w-full max-w-6xl px-5 md:px-8 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
