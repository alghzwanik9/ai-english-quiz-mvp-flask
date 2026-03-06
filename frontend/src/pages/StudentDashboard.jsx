import React, { useEffect, useState } from "react";
import { Card, Button, Select } from "../ui";
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  ArrowRight, 
  LayoutDashboard,
  BrainCircuit,
  History,
  Play,
  PlayCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function authHeaders() {
  try {
    const raw = localStorage.getItem("session_user");
    const token = raw ? JSON.parse(raw)?.token : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return { "Content-Type": "application/json" };
  }
}

export default function StudentDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tests, setTests] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/student/tests`, {
          method: "GET",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load tests");
        if (!cancelled) setTests(Array.isArray(data) ? data : (data?.tests || []));
      } catch (e) {
        if (!cancelled) setError(e?.message);
        // Fallback for demo
        if (!cancelled) setTests([
          { id: 1, name: "English Proficiency Mock", difficulty: "Medium", questions: 20 },
          { id: 2, name: "Vocabulary & Idioms", difficulty: "Easy", questions: 15 }
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-10 animate-in pb-12">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase">Learning Matrix</h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Personalized assessment stream</p>
        </div>
        <Button className="btn-secondary h-12 px-8 font-black uppercase text-xs tracking-widest" onClick={() => nav("/student/history")}>
          <History className="mr-2" size={18} /> Review Performance
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 ml-1">
             <div className="w-1.5 h-4 bg-black" />
             <div className="text-xs font-black uppercase tracking-widest">Active Assignments</div>
          </div>
          
          {loading && !tests.length ? (
            <div className="p-12 text-center text-zinc-300 font-black uppercase tracking-widest animate-pulse">Syncing Portal...</div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {tests.map((test) => (
                <div key={test.id} className="modern-card p-8 bg-white border border-black hover:bg-zinc-50 transition-all group flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-black opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-black font-black border border-black/5 group-hover:bg-black group-hover:text-white transition-all">
                      <BrainCircuit size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-black uppercase tracking-tight">{test.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                         <span className="px-2 py-0.5 bg-zinc-100 text-black rounded border border-black/5">{test.difficulty || "MEDIUM"}</span>
                         <span>• {test.questions_count || test.questions || 0} QUESTIONS</span>
                      </div>
                    </div>
                  </div>
                  <Button className="btn-primary h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => nav(`/student/take/${test.id}`)}>
                    INITIALIZE <PlayCircle size={14} className="ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <Card className="p-8 border-black bg-black text-white shadow-xl" title="LEARNER SCOREBOARD">
            <div className="space-y-8 mt-4">
              <div className="flex items-center justify-between p-6 border border-white/10 rounded-2xl bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Trophy className="text-white" size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global Rank</div>
                    <div className="text-2xl font-black tracking-tighter">#04</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                 <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mastery Level</div>
                 <div className="h-4 bg-white/10 rounded-full overflow-hidden border border-white/5 p-1">
                    <div className="h-full bg-white rounded-full" style={{ width: '75%' }} />
                 </div>
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Advanced</span>
                    <span>75%</span>
                 </div>
              </div>
            </div>
          </Card>

          <Card className="p-8 border-black bg-white shadow-none ring-1 ring-black/5" title="GUIDANCE">
            <p className="text-xs font-bold text-zinc-500 uppercase leading-loose tracking-widest">
              Focus on <span className="text-black font-black underline underline-offset-4 decoration-2">Conditional Tenses</span>. Your recent metrics indicate a persistent weakness in formal syntax structures.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
