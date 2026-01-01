import { useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { cn } from "../ui/cn";

export default function AppShell({ title, role = "teacher", active, onNavigate, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lang, setLang] = useState("EN");
  const dir = useMemo(() => (lang === "AR" ? "rtl" : "ltr"), [lang]);

  return (
    <div dir={dir} className="app-bg text-slate-900 min-h-screen">
      {/* Top Navbar */}
      <Header
        title={title}
        lang={lang}
        onToggleLang={() => setLang((p) => (p === "AR" ? "EN" : "AR"))}
        onOpenMobileMenu={() => setDrawerOpen(true)}   // نفس الزر يفتح الدرج على كل الشاشات
        user={{ name: role === "teacher" ? "Teacher" : "Student" }}
        onLogout={() => alert("Logout")}
        cta={{ label: "Create Test", onClick: () => onNavigate?.("create") }}
      />

      {/* Drawer Sidebar (Hidden by default) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={cn(
              "absolute top-0 h-full w-72 bg-white shadow-2xl",
              "right-0" // دايم من اليمين مثل ما تبي
            )}
          >
            <Sidebar
              role={role}
              active={active}
              onNavigate={(k) => {
                onNavigate?.(k);
                setDrawerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main content full width */}
      <main className="shell">{children}</main>
    </div>
  );
}
