import { cn } from "./cn";

export default function Card({
  className = "",
  children,
  title,
  variant = "default", // default | glass
}) {
  const variants = {
    default: "glass-card overflow-hidden",
    glass: "glass-card overflow-hidden",
  };

  return (
    <div className={cn(variants[variant], className)}>
      {title && (
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-white font-bold tracking-tight">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, compact = false }) {
  return (
    <div
      className={cn(
        compact ? "px-6 py-4 border-b border-white/10" : "px-6 pt-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children }) {
  return <h3 className={cn("text-white font-bold text-lg", className)}>{children}</h3>;
}

export function CardDesc({ className = "", children }) {
  return <p className={cn("text-slate-400 text-sm mt-1", className)}>{children}</p>;
}

export function CardContent({ className = "", children, compact = false }) {
  return (
    <div className={cn(compact ? "px-6 py-6" : "px-6 pb-6 pt-4", className)}>
      {children}
    </div>
  );
}
