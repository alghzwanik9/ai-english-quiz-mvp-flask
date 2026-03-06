import { cn } from "./cn";

export default function Select({ label, className = "", containerClassName = "", children, ...props }) {
  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <label className="label-premium">
          {label}
        </label>
      )}
      <select
        {...props}
        className={cn(
          "input-premium appearance-none", // appearance-none to handle custom arrow if needed, but for now we use default select styling
          className
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='激19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
          backgroundSize: '1.2em'
        }}
      >
        {children}
      </select>
    </div>
  );
}
