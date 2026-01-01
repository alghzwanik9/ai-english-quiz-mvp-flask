import { cn } from "./cn";

export default function Card({
  className = "",
  children,
  variant = "default", // default | glass
}) {
  const variants = {
    default: "rounded-2xl bg-white shadow-sm border border-slate-100",
    glass:
      "rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-900/5",
  };

  return <div className={cn(variants[variant], className)}>{children}</div>;
}

export function CardHeader({ className = "", children, compact = false }) {
  return (
    <div
      className={cn(
        compact ? "px-5 py-4 border-b border-slate-200/60" : "px-6 pt-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children }) {
  return <h3 className={cn("text-slate-900 font-bold", className)}>{children}</h3>;
}

export function CardDesc({ className = "", children }) {
  return <p className={cn("text-slate-600 text-sm mt-1", className)}>{children}</p>;
}

export function CardContent({ className = "", children, compact = false }) {
  return <div className={cn(compact ? "px-5 py-5" : "px-6 pb-6 pt-4", className)}>{children}</div>;
}
