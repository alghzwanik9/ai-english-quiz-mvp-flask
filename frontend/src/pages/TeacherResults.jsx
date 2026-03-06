// src/pages/TeacherResults.jsx (أو نفس مسارك الحالي)
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Button } from "../ui";
import {
  fetchTeacherTests,
  fetchTeacherResults,
  fetchTestResults,
} from "/src/services/teacherService.js";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function formatCreatedAt(value) {
  if (value == null) return "—";

  // عندك created_at في DB غالبًا integer (epoch seconds)
  // بعض APIs ترجع milliseconds أو ISO string
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value; // sec -> ms
    return new Date(ms).toLocaleString();
  }

  // string: ISO
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function TeacherResults() {
  const nav = useNavigate();
  const q = useQuery();
  const initialTestId = toNumber(q.get("testId"));

  const [tests, setTests] = useState([]);
  const [testId, setTestId] = useState(initialTestId);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setBusy(true);
    setErr("");

    try {
      const t = await fetchTeacherTests();
      setTests(Array.isArray(t) ? t : (t?.items || []));

      if (testId) {
        const data = await fetchTestResults(testId);
        setTitle(data?.test?.name ? `نتائج: ${data.test.name}` : "نتائج اختبار");
        setItems(Array.isArray(data?.items) ? data.items : []);
      } else {
        const all = await fetchTeacherResults();
        setTitle("كل النتائج");
        setItems(Array.isArray(all) ? all : (all?.items || []));
      }
    } catch (e) {
      setErr(e?.message || "Failed to load results");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const testsOptions = useMemo(() => {
    return [
      { id: "", name: "كل الاختبارات" },
      ...tests.map((t) => ({ id: String(t.id), name: t.name })),
    ];
  }, [tests]);

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="section-title">
            {title || "Results Dashboard"}
          </h2>
          <p className="section-desc">Track and analyze student performances.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => nav("/teacher")}>
            Back to Dashboard
          </Button>
          <Button onClick={load}>
            Refresh Data
          </Button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 leading-relaxed">
          {err}
        </div>
      ) : null}

      <Card className="p-6" title="Filter Results">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="w-full md:max-w-md">
            <label className="label-premium">Select Test</label>
            <select
              className="input-premium appearance-none py-2 h-11"
              value={testId ? String(testId) : ""}
              onChange={(e) => setTestId(e.target.value ? Number(e.target.value) : null)}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1.2em'
              }}
            >
              {testsOptions.map((o) => (
                <option key={o.id} value={o.id} className="bg-[#0f172a] text-white">
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6" title="Attempt Details">
        {busy ? (
          <div className="p-10 text-center text-slate-400">Loading results...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No results found for this selection.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 text-[10px] uppercase font-bold tracking-[0.1em]">
                <tr className="border-b border-white/5">
                  <th className="py-4 px-2">Student Name</th>
                  <th className="py-4 px-2">Email</th>
                  <th className="py-4 px-2">Score</th>
                  <th className="py-4 px-2">Percentage</th>
                  <th className="py-4 px-2">Date</th>
                </tr>
              </thead>
 
              <tbody className="divide-y divide-white/[0.03]">
                {items.map((r) => (
                  <tr key={r.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-2 font-medium text-white">{r.student_name || "Guest"}</td>
                    <td className="py-4 px-2 text-slate-400">{r.student_email || "—"}</td>
                    <td className="py-4 px-2 font-semibold text-indigo-400">
                      {Number(r.score)}/{Number(r.total)}
                    </td>
                    <td className="py-4 px-2">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                         Number(r.percent) >= 50 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                       }`}>
                        {Number.isFinite(Number(r.percent)) ? `${Math.round(Number(r.percent))}%` : "—"}
                       </span>
                    </td>
                    <td className="py-4 px-2 text-slate-500 text-xs">{formatCreatedAt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
