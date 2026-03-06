import { cn } from "./cn";

export default function Input({ label, className = "", containerClassName = "", id, as: Component = "input", ...props }) {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  
  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="label-premium">
          {label}
        </label>
      )}
      {Component === "textarea" ? (
        <textarea
          id={inputId}
          {...(props)}
          className={cn("input-premium min-h-[100px]", className)}
        />
      ) : (
        <input
          id={inputId}
          {...props}
          className={cn("input-premium", className)}
        />
      )}
    </div>
  );
}
