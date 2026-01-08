export default function Select({ label, className = "", children, ...props }) {
  return (
    <label className={"block " + className}>
      {label ? (
        <div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>
      ) : null}
      <select
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
      >
        {children}
      </select>
    </label>
  );
}
