import React from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  PlusCircle, 
  GraduationCap,
  History,
  X
} from "lucide-react";
import { cn } from "../ui";

export default function Sidebar({ open, setOpen, role = "teacher" }) {
  const teacherLinks = [
    { to: "/teacher", label: "Overview", icon: LayoutDashboard },
    { to: "/teacher/tests", label: "My Tests", icon: FileText },
    { to: "/teacher/create", label: "Create Test", icon: PlusCircle },
    { to: "/teacher/results", label: "Results", icon: GraduationCap },
  ];

  const studentLinks = [
    { to: "/student", label: "Quiz Portal", icon: LayoutDashboard },
    { to: "/student/history", label: "My History", icon: History },
  ];

  const links = role === "teacher" ? teacherLinks : studentLinks;

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-black transform transition-transform duration-500 ease-out lg:translate-x-0 lg:static lg:inset-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          {/* Logo & Close */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                <GraduationCap size={24} weight="bold" />
              </div>
              <span className="text-xl font-black text-black tracking-tighter uppercase font-mono">
                AI QUIZ <span className="text-[10px] block opacity-40 -mt-1 tracking-widest">BETA V1.0</span>
              </span>
            </div>
            <button className="lg:hidden p-2 text-black hover:bg-zinc-100 rounded-lg" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            <div className="text-[10px] font-black text-black opacity-30 uppercase tracking-[0.3em] mb-6 ml-3">Navigation Manager</div>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-black transition-all duration-200 uppercase tracking-widest",
                  isActive 
                    ? "bg-black text-white shadow-xl shadow-black/10 translate-x-1" 
                    : "text-zinc-500 hover:text-black hover:bg-zinc-50"
                )}
              >
                <link.icon size={20} strokeWidth={2.5} />
                {link.label}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-black transition-all duration-200 mt-auto uppercase tracking-widest",
              isActive 
                ? "bg-black text-white" 
                : "text-zinc-500 hover:text-black hover:bg-zinc-50"
            )}
          >
            <Settings size={20} strokeWidth={2.5} />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}
