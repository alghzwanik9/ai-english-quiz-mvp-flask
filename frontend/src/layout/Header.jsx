import { cn } from "../ui/cn";

export default function Header({
  title = "Dashboard",
  lang = "EN",
  isRtl = false,
  onToggleLang,
  onOpenMobileMenu,
  user = { name: "Teacher" },
  onLogout,
  cta, // { label, onClick }
}) {
  return (
    <header className="sticky top-0 z-30">
      <div className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="px-4 lg:px-6 py-4">
          <div
            className={cn(
              "flex items-center justify-between gap-3",
              isRtl && "flex-row-reverse"
            )}
          >
            {/* Side A: menu + title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="grid place-items-center h-10 w-10 rounded-xl border border-slate-200/70 bg-white/80 hover:bg-white transition"
                aria-label="Open menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <div className={cn("min-w-0", isRtl ? "text-right" : "text-left")}>
                <div className="text-xl font-extrabold text-slate-900 truncate">
                  {title}
                </div>
                <div className="text-sm text-slate-500 truncate">
                  AI-powered learning dashboard
                </div>
              </div>
            </div>

            {/* Side B: actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {cta?.label && (
                <button
                  type="button"
                  onClick={cta.onClick}
                  className="h-10 px-4 rounded-xl border border-slate-200/70 bg-white/90 hover:bg-white shadow-sm transition font-semibold text-slate-900"
                >
                  {cta.label}
                </button>
              )}

              <button
                type="button"
                onClick={onToggleLang}
                className={cn(
                  "h-10 px-3 rounded-xl border border-slate-200/70 bg-white/90 hover:bg-white shadow-sm transition",
                  "font-semibold text-slate-900"
                )}
                aria-label="Toggle language"
                title="Toggle language"
              >
                {lang}
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3 h-10 rounded-xl border border-slate-200/70 bg-white/90 shadow-sm">
                <div className="h-7 w-7 rounded-full bg-slate-200" />
                <div className={cn("leading-4", isRtl ? "text-right" : "text-left")}>
                  <div className="text-sm font-semibold text-slate-900">
                    {user?.name || "User"}
                  </div>
                  <div className="text-xs text-slate-500">Signed in</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="h-10 px-4 rounded-xl border border-slate-200/70 bg-white/90 hover:bg-white shadow-sm transition font-semibold text-slate-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
