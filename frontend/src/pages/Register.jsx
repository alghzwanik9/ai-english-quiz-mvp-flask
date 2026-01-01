import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../lib/storage";
import { Card, Input, Select, Button } from "../components/ui";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setMsg("");
    const r = registerUser({ name, email, password, role });
    if (!r.ok) return setMsg(r.message || "Register failed");
    nav("/login");
  };

  return (
    <>

      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center mt-6">
        <div className="w-full max-w-md">
          <Card title="Register">
            <form onSubmit={submit} className="space-y-2">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </Select>

              {msg ? <div className="text-sm text-red-600">{msg}</div> : null}

              <div className="flex gap-2 pt-2">
                <Button type="submit">Create account</Button>
                <Link className="btnx-ghost" to="/login">Back</Link>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
