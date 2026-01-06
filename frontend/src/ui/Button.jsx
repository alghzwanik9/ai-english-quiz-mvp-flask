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
    "inline-flex items-center justify-center rounded-xl font-semibold transition " +
    "focus:outline-none focus:ring-2 focus:ring-slate-200 " +
    "disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none";

  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "border border-slate-200/70 bg-white/90 text-slate-900 hover:bg-white",
    ghost: "bg-transparent text-slate-900 hover:bg-slate-100",
  };

  const sizes = {
    md: "h-10 px-4 text-sm",
    sm: "h-9 px-3 text-sm",
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
