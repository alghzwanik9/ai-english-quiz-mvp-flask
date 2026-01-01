import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../lib/storage";
import { Card, Input, Button } from "../components/ui";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("teacher@test.com");
  const [password, setPassword] = useState("1234");
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setMsg("");
    const u = login(email, password);
    if (!u) return setMsg("Invalid email or password");
    nav(u.role === "teacher" ? "/teacher" : "/student");
  };

  return (
    <>

      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center mt-6">
        <div className="w-full max-w-md">
          <Card title="Login">
            <form onSubmit={submit} className="space-y-2">
              <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {msg ? <div className="text-sm text-red-600">{msg}</div> : null}

              <div className="flex gap-2 pt-2">
                <Button type="submit">Login</Button>
                <Link className="btnx-ghost" to="/register">Register</Link>
              </div>

              <div className="muted pt-2">
                Demo: teacher@test.com / 1234 — student@test.com / 1234
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
