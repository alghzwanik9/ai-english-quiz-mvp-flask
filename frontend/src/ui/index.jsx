import React from "react";
export { default as Card } from "./Card.jsx";
export { CardHeader, CardTitle, CardDesc, CardContent } from "./Card.jsx";
export { default as Button } from "./Button.jsx";
export { cn } from "./cn.js";
import { Card, CardContent, CardDesc, CardHeader, CardTitle, Button } from "../ui";

export function Card({ title, children, className = "" }) {
  return (
    <div className={`cardx ${className}`}>
      {title ? (
        <div className="cardx-h">
          <div className="h2">{title}</div>
        </div>
      ) : null}
      <div className="cardx-b">{children}</div>
    </div>
  );
}

export function Button({ children, variant = "primary", type = "button", className = "", ...props }) {
  const v =
    variant === "primary" ? "btnx-primary" :
    variant === "danger" ? "btnx-danger" :
    "btnx-ghost";

  return (
    <button type={type} className={`${v} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <div className={`mb-3 ${className}`}>
      {label ? <label className="labelx">{label}</label> : null}
      <input className="inputx" {...props} />
    </div>
  );
}

export function Select({ label, className = "", children, ...props }) {
  return (
    <div className={`mb-3 ${className}`}>
      {label ? <label className="labelx">{label}</label> : null}
      <select className="selectx" {...props}>{children}</select>
    </div>
  );
}
