import { cn } from "../ui/cn";

function Icon({ name, className = "" }) {
  const base = "h-5 w-5";
  switch (name) {
    case "dashboard":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-11h7V4h-7v5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "create":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "bank":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none">
          <path d="M7 4h10v16H7V4Z" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M9 8h6M9 12h6M9 16h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "imports":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8 9l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 21h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "settings":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19.4 15a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.5-2.3.6a7.8 7.8 0 0 0-1.7-1l-.3-2.3H9.2L8.9 7.9a7.8 7.8 0 0 0-1.7 1l-2.3-.6-2 3.5 2 1.2a7.8 7.8 0 0 0 .1 2l-2 1.2 2 3.5 2.3-.6c.5.4 1.1.7 1.7 1l.3 2.3h5.6l.3-2.3c.6-.3 1.2-.6 1.7-1l2.3.6 2-3.5-2-1.2Z"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

const teacherNav = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "create", label: "Create Test", icon: "create" },
  { key: "bank", label: "Question Bank", icon: "bank" },
  { key: "imports", label: "Imports Review", icon: "imports" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export default function Sidebar({
  role = "teacher",
  active = "dashboard",
  onNavigate,
  isRtl = false,
}) {
  const items = role === "teacher" ? teacherNav : teacherNav;

  return (
    <aside className="h-full w-72">
      <div
        className={cn(
          "h-full bg-white/70 backdrop-blur-xl",
          isRtl ? "border-l border-slate-200/60" : "border-r border-slate-200/60"
        )}
      >
        {/* رأس السايدبار */}
        <div className="px-5 pt-5 pb-4">
          <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-sm" />
            <div className={cn(isRtl ? "text-right" : "text-left")}>
              <div className="font-extrabold text-slate-900 leading-5">AI English Quiz</div>
              <div className="text-xs text-slate-500">
                {role === "teacher" ? "Teacher Panel" : "Student Panel"}
              </div>
            </div>
          </div>
        </div>

        {/* روابط التنقل */}
        <nav className="px-3 pb-5 space-y-1">
          {items.map((it) => {
            const isActive = it.key === active;
            return (
              <button
                key={it.key}
                onClick={() => onNavigate?.(it.key)}
                className={cn(
                  "group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                  isRtl ? "text-right flex-row-reverse" : "text-left",
                  isActive
                    ? "bg-indigo-50/80 text-indigo-700 border border-indigo-100 shadow-sm"
                    : "text-slate-700 hover:bg-white/70 hover:shadow-sm"
                )}
              >
                <span
                  className={cn(
                    "grid place-items-center h-9 w-9 rounded-xl border transition",
                    isActive
                      ? "bg-white border-indigo-100"
                      : "bg-slate-50/70 border-slate-200/60 group-hover:bg-white"
                  )}
                >
                  <Icon
                    name={it.icon}
                    className={isActive ? "text-indigo-700" : "text-slate-600"}
                  />
                </span>

                <span className="font-semibold">{it.label}</span>

                <span
                  className={cn(
                    isRtl ? "mr-auto" : "ml-auto",
                    "h-2 w-2 rounded-full",
                    isActive ? "bg-indigo-600" : "bg-transparent"
                  )}
                />
              </button>
            );
          })}
        </nav>

        {/* الفوتر */}
        <div className="px-5 pb-5 pt-2 border-t border-slate-200/60 text-xs text-slate-400">
          v1 • TESTING
        </div>
      </div>
    </aside>
  );
}
