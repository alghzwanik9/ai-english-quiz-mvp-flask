import React from "react";

export default function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none " +
        "focus:ring-2 focus:ring-slate-200 disabled:opacity-60 disabled:cursor-not-allowed " +
        className
      }
    />
  );
}
