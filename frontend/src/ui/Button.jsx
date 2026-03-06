import { cn } from "./cn";

export default function Button({
  className = "",
  children,
  variant = "default", // default | outline | ghost
  size = "md",         // md | sm
  type = "button",
  disabled = false,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 " +
    "active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    default: "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] hover:bg-indigo-500",
    outline: "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white backdrop-blur-sm",
    ghost: "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white",
  };

  const sizes = {
    md: "h-11 px-6 text-sm",
    sm: "h-9 px-4 text-xs",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)}
      {...props}
    >
      {children}
    </button>
  );
}
