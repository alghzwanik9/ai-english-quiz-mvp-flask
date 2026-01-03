import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { cn } from "../ui/cn";
import { STRINGS } from "../i18n/strings";

export default function AppShell({
  title,
  role = "teacher",
  active,
  onNavigate,
  children,
}) {
  // ===== حالات الواجهة (State) =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  // ===== الترجمة + اتجاه الصفحة =====
  const t = STRINGS[lang] || STRINGS.en;
  const dir = useMemo(() => (lang === "ar" ? "rtl" : "ltr"), [lang]);
  const isRtl = dir === "rtl";

  // ===== سلوك الدرج: ESC + منع سكرول الخلفية وقت فتح الدرج =====
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

  // ===== حفظ اللغة وتحديث خصائص HTML (lang/dir) =====
  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  // ===== اتجاه الدرج حسب RTL/LTR =====
  const drawerSide = isRtl ? "right-0" : "left-0";
  const drawerClosedTransform = isRtl ? "translate-x-full" : "-translate-x-full";

  return (
    <div dir={dir} className="app-bg text-slate-900 min-h-screen">
      {/* ===== الهيدر العلوي ===== */}
      <Header
        title={title}
        lang={lang}
        isRtl={isRtl}
        onToggleLang={() => setLang((p) => (p === "ar" ? "en" : "ar"))}
        onOpenMobileMenu={() => setDrawerOpen(true)}
        user={{ name: role === "teacher" ? t.teacher : t.student }}
        onLogout={() => alert("Logout")}
        cta={{ label: t.createTest, onClick: () => onNavigate?.("create") }}
      />

      {/* ===== درج السايدبار (للجوال) ===== */}
      <div
        className={cn(
          "fixed inset-0 z-50",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!drawerOpen}
      >
        {/* طبقة التعتيم (Overlay) */}
        <div
          className={cn(
            "absolute inset-0 bg-black/30 transition-opacity duration-200",
            drawerOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setDrawerOpen(false)}
        />

        {/* لوحة الدرج */}
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
            {/* رأس الدرج */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-bold text-slate-900">{t.menu}</div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                {t.close}
              </button>
            </div>

            {/* قائمة السايدبار */}
            <div className="flex-1 overflow-auto">
              <Sidebar
                role={role}
                active={active}
                isRtl={isRtl}
                onNavigate={(k) => {
                  onNavigate?.(k);
                  setDrawerOpen(false);
                }}
              />

            </div>
          </div>
        </div>
      </div>

      {/* ===== محتوى الصفحة ===== */}
      <main className="shell">{children}</main>
    </div>
  );
}
