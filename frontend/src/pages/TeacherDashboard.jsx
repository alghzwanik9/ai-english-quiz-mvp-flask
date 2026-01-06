import { useMemo, useRef, useState } from "react";
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
          <path
            d="M9 8h6M9 12h6M9 16h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "questions":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path
            d="M7 7h10M7 12h10M7 17h6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M5 4h14v16H5V4Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "students":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path
            d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4 20c1.6-3.5 5-5.5 8-5.5s6.4 2 8 5.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M12 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M8 9l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[9999]">
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 shadow-lg bg-white/90 backdrop-blur",
          toast.type === "success" && "border-emerald-200",
          toast.type === "error" && "border-rose-200",
          toast.type === "info" && "border-slate-200"
        )}
      >
        <div className="text-sm font-semibold text-slate-900">{toast.msg}</div>
      </div>
    </div>
  );
}

export default function TeacherDashboard({ go }) {
  const [tests, setTests] = useState([
    { id: 1, name: "Basics 1", subject: "Grammar", q: 10, date: "2025-12-29" },
    { id: 2, name: "Vocabulary A", subject: "Vocab", q: 15, date: "2025-12-28" },
  ]);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

  // Toast
  const [toast, setToast] = useState(null); // {type,msg}
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  // Confirm Save
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTest, setPendingTest] = useState(null);

  // AI panel + refs
  const [aiOpen, setAiOpen] = useState(false);
  const aiPanelRef = useRef(null);

  // flash highlight
  const [aiFlash, setAiFlash] = useState(false);

  const openAndScrollToAI = () => {
    setAiOpen(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        aiPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setAiFlash(true);
        setTimeout(() => setAiFlash(false), 900);
      }, 50);
    });
  };

  // AI form
  const [material, setMaterial] = useState("English Grammar");
  const [topic, setTopic] = useState("Past Simple");
  const [difficulty, setDifficulty] = useState("easy");
  const [count, setCount] = useState(5);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [aiResult, setAiResult] = useState(null);

  // preview toggle
  const [previewOpen, setPreviewOpen] = useState(true);

  // view modal
  const [viewOpen, setViewOpen] = useState(false);
  const [activeTest, setActiveTest] = useState(null);

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
      showToast("success", `Generated ${data?.questions?.length || 0} questions ✅`);
    } catch (e) {
      const msg = e?.message || "Failed to generate";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  const questions = useMemo(() => aiResult?.questions || [], [aiResult]);

  // ✅ بدل الحفظ المباشر: جهّز Pending + افتح Confirm
  const createTestFromAI = () => {
    if (!questions.length) return;

    const draft = {
      id: Date.now(),
      name: `${topic} (${difficulty})`,
      subject: material,
      q: questions.length,
      date: new Date().toISOString().slice(0, 10),
      questions,
    };

    setPendingTest(draft);
    setConfirmOpen(true);
  };

  // ✅ الحفظ النهائي من المودال
  const confirmSaveTest = () => {
    if (!pendingTest) return;

    setTests((prev) => [pendingTest, ...prev]);

    setConfirmOpen(false);
    setPendingTest(null);

    setAiOpen(false);
    setAiResult(null);

    showToast("success", "Saved as a new Test 💾");
  };

  const copyQuestions = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(questions, null, 2));
      showToast("info", "Copied questions to clipboard 📋");
    } catch {
      showToast("error", "Copy failed");
    }
  };

  // Dynamic stats
  const totalTests = tests.length;
  const totalQuestions = tests.reduce((s, t) => s + (Number(t.q) || 0), 0);
  const aiGenerated = tests.filter((t) => Array.isArray(t.questions) && t.questions.length > 0).length;

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tests" value={String(totalTests)} icon="tests" trend="+0%" />
        <StatCard label="Total Questions" value={String(totalQuestions)} icon="questions" trend="+0%" />
        <StatCard label="Active Students" value="38" icon="students" trend="+0%" />
        <StatCard label="AI Generated" value={String(aiGenerated)} icon="spark" trend="+0%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card variant="glass" className="lg:col-span-8">
          <CardHeader compact>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Recent Tests</CardTitle>
                <CardDesc>Quick view of your latest created tests</CardDesc>
              </div>

              <Button size="sm" onClick={() => go?.("create")}>
                Create
              </Button>
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
                    <tr
                      key={t.id}
                      className="border-b border-slate-200/60 hover:bg-white/60 transition"
                    >
                      <td className="py-3 font-semibold text-slate-900">{t.name}</td>
                      <td className="py-3">
                        <Badge>{t.subject}</Badge>
                      </td>
                      <td className="py-3">{t.q}</td>
                      <td className="py-3 text-slate-500">{t.date}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setActiveTest(t);
                              setViewOpen(true);
                            }}
                          >
                            View
                          </Button>
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
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-left hover:bg-white transition">
              <div className="font-semibold text-slate-900">Create New Test</div>
              <div className="text-sm text-slate-600 mt-1">Build manually from question bank.</div>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={() => go?.("create")}>
                  Create
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-left hover:bg-white transition">
              <div className="font-semibold text-slate-900">Import PDF / CSV</div>
              <div className="text-sm text-slate-600 mt-1">Upload content and convert into questions.</div>
              <div className="mt-3">
                <Button type="button" size="sm" variant="outline" onClick={() => go?.("imports")}>
                  Import
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-left hover:bg-white transition">
              <div className="font-semibold text-slate-900">AI Generator</div>
              <div className="text-sm text-slate-600 mt-1">Generate MCQ using AI and save to database.</div>

              <div className="mt-3 flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={openAndScrollToAI}>
                  Open
                </Button>

                <Button type="button" size="sm" onClick={generateAI} disabled={loading}>
                  {loading ? "Generating..." : "Quick Generate"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Generator Panel */}
      {aiOpen && (
        <div ref={aiPanelRef} className={cn(aiFlash && "ring-2 ring-slate-300 rounded-3xl")}>
          <Card variant="glass">
            <CardHeader compact>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>AI Generator</CardTitle>
                  <CardDesc>Generate MCQ and auto-save to database.</CardDesc>
                </div>

                <Button type="button" size="sm" variant="ghost" onClick={() => setAiOpen(false)}>
                  Close
                </Button>
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

              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" onClick={generateAI} disabled={loading}>
                  {loading ? "Generating..." : "Generate"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={createTestFromAI}
                  disabled={loading || questions.length === 0}
                >
                  Save as Test
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={copyQuestions}
                  disabled={loading || questions.length === 0}
                >
                  Copy
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPreviewOpen((v) => !v)}
                  disabled={loading && !questions.length}
                >
                  {previewOpen ? "Hide Preview" : "Show Preview"}
                </Button>

                {aiResult?.source && <Badge>source: {aiResult.source}</Badge>}
              </div>

              {err && <div className="text-sm text-rose-600">{err}</div>}

              {/* Preview */}
              {!loading && previewOpen && questions.length > 0 && (
                <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">Preview ({questions.length})</div>
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
        </div>
      )}

      {/* View Test Modal */}
      {viewOpen && activeTest && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200/60 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-900">{activeTest.name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  <span className="font-semibold">Subject:</span> {activeTest.subject || "-"}{" "}
                  <span className="mx-2">•</span>
                  <span className="font-semibold">Questions:</span>{" "}
                  {activeTest.q ?? activeTest.questions?.length ?? 0}
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setViewOpen(false);
                  setActiveTest(null);
                }}
              >
                Close
              </Button>
            </div>

            <div className="mt-4 space-y-3 max-h-[70vh] overflow-auto pr-1">
              {(activeTest.questions || []).length === 0 ? (
                <div className="text-sm text-slate-600">No questions stored for this test.</div>
              ) : (
                (activeTest.questions || []).map((q, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {idx + 1}. {q.question}
                    </div>

                    <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                      {(q.choices || []).map((c, i) => (
                        <li
                          key={i}
                          className={cn(
                            "rounded-xl border border-slate-200/60 bg-white px-3 py-2",
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
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setViewOpen(false);
                  setActiveTest(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Confirm Save Modal */}
      {confirmOpen && pendingTest && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200/60 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-900">Confirm Save</div>
                <div className="mt-1 text-sm text-slate-600">Save this AI-generated test?</div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingTest(null);
                }}
              >
                Close
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/60 bg-slate-50 p-4 space-y-2">
              <div className="text-sm">
                <span className="font-semibold text-slate-900">Name:</span>{" "}
                <span className="text-slate-700">{pendingTest.name}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-slate-900">Material:</span>{" "}
                <span className="text-slate-700">{pendingTest.subject}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-slate-900">Questions:</span>{" "}
                <span className="text-slate-700">{pendingTest.q}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingTest(null);
                  showToast("info", "Canceled");
                }}
              >
                Cancel
              </Button>

              <Button onClick={confirmSaveTest}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

