import React, { useEffect, useMemo, useState } from "react";
import { Card, Button, Input } from "../ui";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Clock,
  BarChart3,
  Copy,
  ExternalLink
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const FRONT_BASE = import.meta.env.VITE_FRONT_BASE || window.location.origin;

// ---------- helpers ----------
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

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

function isoToNice(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card className="p-6 border-black shadow-none ring-1 ring-black/5 bg-white relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={64} />
      </div>
      <div className="space-y-4">
        <div className="bg-zinc-100 w-12 h-12 rounded-xl flex items-center justify-center text-black">
          <Icon size={24} />
        </div>
        <div>
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{label}</div>
          <div className="text-3xl font-black text-black tracking-tighter mt-1">{value}</div>
        </div>
      </div>
    </Card>
  );
}

export default function TeacherDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [tests, setTests] = useState([]);
  const [q, setQ] = useState("");
  const [stats, setStats] = useState({
    totalTests: null,
    totalAttempts: null,
    avgScore: null,
    activeStudents: null,
  });

  const buildStudentLink = (id) => `${FRONT_BASE}/student/take?testId=${id}`;

  async function handleCopyLink(testId) {
    const link = buildStudentLink(testId);
    const ok = await copyText(link);
    setCopyMsg(ok ? "Copied!" : "Failed");
    setTimeout(() => setCopyMsg(""), 2000);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/teacher/tests`, {
          method: "GET",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) throw new Error(data?.error || "Failed to load tests");
        const arr = safeArr(Array.isArray(data) ? data : data?.items || data?.tests || data);
        if (!cancelled) setTests(arr);

        // Stats
        const sres = await fetch(`${API_BASE}/api/teacher/stats`, {
          method: "GET",
          headers: authHeaders(),
        });
        if (sres.ok) {
          const sdata = await sres.json();
          if (!cancelled && sdata?.ok !== false) {
            setStats({
              totalTests: Number(sdata?.total_tests ?? arr.length),
              totalAttempts: Number(sdata?.total_attempts ?? 0),
              avgScore: Number(sdata?.avg_percent ?? 0),
              activeStudents: Number(sdata?.active_students ?? 0),
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return tests;
    return tests.filter(t => 
      String(t?.name || "").toLowerCase().includes(qq) ||
      String(t?.subject || "").toLowerCase().includes(qq)
    );
  }, [tests, q]);

  const fmtStat = (v, suffix = "") => loading ? "…" : (v === null ? "—" : `${v}${suffix}`);

  return (
    <div className="space-y-8 animate-in pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase">Insights Engine</h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Real-time performance analytics</p>
        </div>
        <div className="flex gap-3">
          <Button className="btn-primary font-black text-xs uppercase px-8 h-12" onClick={() => nav("/teacher/create")}>
            + INNOVATE TEST
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="TOTAL ASSESSMENTS" value={fmtStat(stats.totalTests)} icon={FileText} />
        <StatCard label="TOTAL ATTEMPTS" value={fmtStat(stats.totalAttempts)} icon={Users} />
        <StatCard label="SUCCESS QUOTA" value={fmtStat(stats.avgScore, "%")} icon={CheckCircle} />
        <StatCard label="COGNITIVE MEAN" value={fmtStat(stats.activeStudents)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-8 border-black shadow-none ring-1 ring-black/5 bg-white" title="DEPLOYMENT PIPELINE">
           <div className="mb-6">
             <Input 
               placeholder="Filter tests..." 
               value={q} 
               onChange={(e) => setQ(e.target.value)} 
               className="border-black font-black"
             />
           </div>

           {loading ? (
             <div className="p-12 text-center text-zinc-300 font-black uppercase tracking-widest animate-pulse">Synchronizing...</div>
           ) : filtered.length === 0 ? (
             <div className="p-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl text-zinc-400 font-bold uppercase tracking-widest">Archive Empty</div>
           ) : (
             <div className="space-y-4">
                {filtered.map((t) => (
                  <div key={t.id} className="p-6 border border-zinc-100 rounded-2xl hover:border-black transition-all group flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center text-black font-black border border-black/5 group-hover:bg-black group-hover:text-white transition-colors">
                        {t.id}
                      </div>
                      <div>
                        <div className="font-black text-black uppercase tracking-tight">{t.name || "Untitled"}</div>
                        <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          <span className="px-2 py-0.5 bg-zinc-100 text-black rounded">{t.subject || "General"}</span>
                          <span>{isoToNice(t.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Button size="sm" className="btn-secondary h-9 px-4 text-[10px] font-black uppercase" onClick={() => handleCopyLink(t.id)}>
                         {copyMsg && copyMsg.includes(t.id) ? "DONE" : "SHARE"}
                       </Button>
                       <Button size="sm" className="btn-primary h-9 px-4 text-[10px] font-black uppercase" onClick={() => nav(`/teacher/results?testId=${t.id}`)}>
                         RESULTS
                       </Button>
                    </div>
                  </div>
                ))}
             </div>
           )}
        </Card>

        <Card className="p-8 border-black shadow-none ring-1 ring-black/5 bg-black text-white" title="SYSTEM STATUS">
          <div className="space-y-8">
            <div className="p-6 bg-white/10 rounded-2xl border border-white/5">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">AI Engine Level</div>
              <p className="text-sm font-bold uppercase tracking-wide leading-relaxed">
                Neutral High-Contrast Mode Active. <br />
                Optimization level: Maximum.
              </p>
            </div>
            
            <div className="flex items-center gap-4 p-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <div className="text-[10px] font-black uppercase tracking-widest">API Endpoint: STABLE</div>
            </div>

            <Button className="w-full h-12 bg-white text-black hover:bg-zinc-100 font-black uppercase tracking-widest text-xs" onClick={() => nav("/teacher/create")}>
               CREATE ASSESSMENT
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
