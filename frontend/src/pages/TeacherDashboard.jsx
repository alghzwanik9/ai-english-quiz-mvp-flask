import { useMemo, useState } from "react";
import Card, { CardContent, CardDesc, CardHeader, CardTitle } from "../ui/Card";
import Button from "../ui/Button";
import { cn } from "../ui/cn";

function MiniIcon({ type = "spark" }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "tests":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M7 4h10v16H7V4Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "questions":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M7 7h10M7 12h10M7 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 4h14v16H5V4Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "students":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 20c1.6-3.5 5-5.5 8-5.5s6.4 2 8 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M12 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200/60 bg-white/70 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function Trend({ value = "+0%" }) {
  const positive = String(value).trim().startsWith("+");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      )}
    >
      {value}
    </span>
  );
}

function StatCard({ label, value, icon, trend }) {
  return (
    <Card variant="glass">
      <CardHeader compact>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDesc>{label}</CardDesc>
            <CardTitle className="text-3xl mt-2">{value}</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <Trend value={trend} />
            <div className="grid place-items-center h-9 w-9 rounded-xl border border-slate-200/60 bg-white/70 text-slate-700">
              <MiniIcon type={icon} />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent compact className="pt-0">
        <div className="text-xs text-slate-500">Last 30 days</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default function TeacherDashboard({ go }) {
  const tests = [
    { id: 1, name: "Basics 1", subject: "Grammar", q: 10, date: "2025-12-29" },
    { id: 2, name: "Vocabulary A", subject: "Vocab", q: 15, date: "2025-12-28" },
  ];

  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

  // AI form
  const [aiOpen, setAiOpen] = useState(false);
  const [material, setMaterial] = useState("English Grammar");
  const [topic, setTopic] = useState("Past Simple");
  const [difficulty, setDifficulty] = useState("easy");
  const [count, setCount] = useState(5);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [aiResult, setAiResult] = useState(null);

  const generateAI = async () => {
    setErr("");
    setLoading(true);
    setAiResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/ai/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material,
          topic,
          difficulty,
          count: Number(count) || 5,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setAiResult(data);
    } catch (e) {
      setErr(e?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const questions = useMemo(() => aiResult?.questions || [], [aiResult]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tests" value="12" icon="tests" trend="+12%" />
        <StatCard label="Total Questions" value="240" icon="questions" trend="+8%" />
        <StatCard label="Active Students" value="38" icon="students" trend="+5%" />
        <StatCard label="AI Generated" value="7" icon="spark" trend="+3%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card variant="glass" className="lg:col-span-8">
          <CardHeader compact>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Recent Tests</CardTitle>
                <CardDesc>Quick view of your latest created tests</CardDesc>
              </div>

              <Button size="sm" onClick={() => go?.("create")}>Create</Button>
            </div>
          </CardHeader>

          <CardContent compact>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200/60">
                    <th className="py-2 text-left font-medium">Name</th>
                    <th className="py-2 text-left font-medium">Subject</th>
                    <th className="py-2 text-left font-medium">Questions</th>
                    <th className="py-2 text-left font-medium">Created</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {tests.map((t) => (
                    <tr key={t.id} className="border-b border-slate-200/60 hover:bg-white/60 transition">
                      <td className="py-3 font-semibold text-slate-900">{t.name}</td>
                      <td className="py-3">
                        <Badge>{t.subject}</Badge>
                      </td>
                      <td className="py-3">{t.q}</td>
                      <td className="py-3 text-slate-500">{t.date}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="ghost">View</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="lg:col-span-4">
          <CardHeader compact>
            <CardTitle>Quick Actions</CardTitle>
            <CardDesc>Start faster with common actions</CardDesc>
          </CardHeader>

          <CardContent compact className="flex flex-col gap-3">
            <button className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-left hover:bg-white transition">
              <div className="font-semibold text-slate-900">Create New Test</div>
              <div className="text-sm text-slate-600 mt-1">Build manually from question bank.</div>
              <div className="mt-3">
                <Button size="sm" onClick={() => go?.("create")}>Create</Button>
              </div>
            </button>

            <button className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-left hover:bg-white transition">
              <div className="font-semibold text-slate-900">Import PDF / CSV</div>
              <div className="text-sm text-slate-600 mt-1">Upload content and convert into questions.</div>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => go?.("imports")}>Import</Button>
              </div>
            </button>

            <button
              className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-left hover:bg-white transition"
              onClick={() => setAiOpen(true)}
            >
              <div className="font-semibold text-slate-900">Generate with AI</div>
              <div className="text-sm text-slate-600 mt-1">Create questions from a topic.</div>
              <div className="mt-3">
                <Button size="sm" variant="outline">Generate</Button>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* AI Generator Panel */}
      {aiOpen && (
        <Card variant="glass">
          <CardHeader compact>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>AI Generator</CardTitle>
                <CardDesc>Generate MCQ and auto-save to database.</CardDesc>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setAiOpen(false)}>Close</Button>
            </div>
          </CardHeader>

          <CardContent compact className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Material">
                <input
                  className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
              </Field>

              <Field label="Topic">
                <input
                  className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </Field>

              <Field label="Difficulty">
                <select
                  className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
              </Field>

              <Field label="Count">
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={generateAI} disabled={loading}>
                {loading ? "Generating..." : "Generate"}
              </Button>

              {aiResult?.source && (
                <Badge>source: {aiResult.source}</Badge>
              )}

              {err && (
                <div className="text-sm text-rose-600">{err}</div>
              )}
            </div>

            {questions.length > 0 && (
              <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">Preview ({questions.length})</div>
                  {Array.isArray(aiResult?.saved_ids) && (
                    <Badge>saved: {aiResult.saved_ids.length}</Badge>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  {questions.map((q, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200/60 bg-white/70 p-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {idx + 1}. {q.question}
                      </div>
                      <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                        {(q.choices || []).map((c, i) => (
                          <li
                            key={i}
                            className={cn(
                              "rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2",
                              c === q.answer && "border-emerald-200 bg-emerald-50 text-emerald-800"
                            )}
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                      {q.explanation && (
                        <div className="mt-2 text-xs text-slate-600">Explanation: {q.explanation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
