import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { cn } from "../ui/cn";

export default function AppShell({
  title,
  role = "teacher",
  active,
  onNavigate,
  children,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lang, setLang] = useState("EN");
  const dir = useMemo(() => (lang === "AR" ? "rtl" : "ltr"), [lang]);
  const isRtl = dir === "rtl";

  // اقفل الدرج بـ ESC + امنع سكرول الخلفية وقت الفتح
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    if (drawerOpen) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // اتجاه الدرج حسب اللغة
  const drawerSide = isRtl ? "right-0" : "left-0";
  const drawerClosedTransform = isRtl ? "translate-x-full" : "-translate-x-full";

  return (
    <div dir={dir} className="app-bg text-slate-900 min-h-screen">
      {/* Top Navbar */}
      <Header
        title={title}
        lang={lang}
        isRtl={isRtl}
        onToggleLang={() => setLang((p) => (p === "AR" ? "EN" : "AR"))}
        onOpenMobileMenu={() => setDrawerOpen(true)}
        user={{ name: role === "teacher" ? "Teacher" : "Student" }}
        onLogout={() => alert("Logout")}
        cta={{ label: "Create Test", onClick: () => onNavigate?.("create") }}
      />

      {/* Drawer Sidebar (Animated) */}
      <div
        className={cn(
          "fixed inset-0 z-50",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!drawerOpen}
      >
        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/30 transition-opacity duration-200",
            drawerOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setDrawerOpen(false)}
        />

        {/* Panel */}
        <div
          className={cn(
            "absolute top-0 h-full w-[18rem] sm:w-80 bg-white shadow-2xl",
            "transition-transform duration-200 ease-out will-change-transform",
            drawerSide,
            drawerOpen ? "translate-x-0" : drawerClosedTransform
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-bold text-slate-900">Menu</div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-auto">
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
        </div>
      </div>

      {/* Main content */}
      <main className="shell">{children}</main>
    </div>
  );
}
