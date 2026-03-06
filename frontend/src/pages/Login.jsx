// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import { Card, Input, Button } from "../ui";
import { GraduationCap, ArrowRight, Mail, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user?.role) throw new Error("Login response missing role");
      nav(user.role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 animate-in">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-black text-white mb-8 shadow-2xl">
            <GraduationCap size={40} />
          </div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Welcome Back</h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest leading-loose">
            Enter your credentials to access your <br />
            Next-Gen Learning Portal
          </p>
        </div>

        <Card className="p-10 border-black shadow-none ring-1 ring-black/5 bg-white">
          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="EMAIL ADDRESS"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-black font-black"
            />
            <Input
              label="SECRET PASSWORD"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-black font-black"
            />

            {error && (
              <div className="p-4 bg-zinc-100 border border-black/10 text-[10px] font-black uppercase text-black tracking-widest">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-14 btn-primary text-sm font-black uppercase tracking-[0.2em]" disabled={loading}>
              {loading ? "Authenticating..." : "Establish Session"}
              {!loading && <ArrowRight className="ml-2" size={18} />}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-black/5 text-center">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
              No account?{" "}
              <Link to="/register" className="text-black hover:underline underline-offset-4 decoration-2">
                Initiate Registration
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
