import { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

function cls(...x) {
  return x.filter(Boolean).join(" ");
}

export default function StrictQuiz({ onBack }) {
  const [subject, setSubject] = useState("General");
  const [text, setText] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("easy");
  const [save, setSave] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  const canSubmit = useMemo(() => text.trim().length >= 20 && Number(count) > 0, [text, count]);

  const generate = async () => {
    setErr("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          text,
          count: Number(count),
          difficulty,
          save,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
      }

      setResult(data);
    } catch (e) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      alert("Copied!");
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">STRICT-QUIZ</h1>
            <p className="text-sm text-slate-600">
              Paste your lesson content and generate questions strictly from it.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              onClick={generate}
              disabled={!canSubmit || loading}
              className={cls(
                "rounded-xl px-4 py-2 text-sm font-medium",
                canSubmit && !loading
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              )}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-slate-600">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="e.g., Physics / Biology / OS / Math..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Questions</label>
            <input
              type="number"
              min="1"
              max="20"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={save}
                onChange={(e) => setSave(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Save to DB
            </label>
          </div>

          <div className="md:col-span-12">
            <label className="mb-1 block text-xs font-medium text-slate-600">Lesson text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Paste the lesson content here..."
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{text.trim().length} chars</span>
              <span>{canSubmit ? "Ready" : "Type at least ~20 characters"}</span>
            </div>
          </div>
        </div>

        {/* Errors */}
        {err && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Generated Questions</h2>
              <button
                onClick={copyJson}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Copy JSON
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(result.questions || []).map((q, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">Q{idx + 1}</div>
                      <div className="mt-1 font-medium">{q.question}</div>
                    </div>
                    <div className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {q.answer || q.correct_answer || "?"}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {(q.choices || []).map((c, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      >
                        {c}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <span className="font-medium">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-10 text-xs text-slate-500">
          API Base: <span className="font-mono">{API_BASE}</span> • Endpoint:{" "}
          <span className="font-mono">/api/ai/generate-quiz</span>
        </div>
      </div>
    </div>
  );
}
