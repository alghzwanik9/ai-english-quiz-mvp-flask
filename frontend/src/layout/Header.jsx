import React from "react";
import { Menu, LogOut, Bell } from "lucide-react";
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";

export default function Header({ onOpenSidebar }) {
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between bg-white/80 backdrop-blur-md px-6 border-b border-black/10">
      <button className="lg:hidden p-2 text-black hover:bg-zinc-100 rounded-xl transition-colors" onClick={onOpenSidebar}>
        <Menu size={24} />
      </button>

      <div className="flex items-center gap-4 ml-auto">
        <button className="p-2.5 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-xl transition-all">
          <Bell size={20} />
        </button>
        <div className="h-8 w-[1px] bg-black/5 mx-2" />
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 pl-2 pr-4 py-2 rounded-xl text-sm font-black text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <LogOut size={16} />
          </div>
          Logout
        </button>
      </div>
    </header>
  );
}
