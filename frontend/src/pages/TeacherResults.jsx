import { useMemo, useState } from "react";
import { getAttempts, getTests } from "../lib/storage";
import Card, { CardContent, CardDesc, CardHeader, CardTitle } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function fmtDate(ms) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

function normalizeAttempt(a) {
  const total = Number(a?.total) || 0;
  const score = Number(a?.score) || 0;
  const passScore = Number.isFinite(Number(a?.passScore)) ? Number(a.passScore) : 60;

  const percent =
    Number.isFinite(Number(a?.percent)) ? Number(a.percent) : total ? Math.round((score / total) * 100) : 0;

  const passed =
    typeof a?.passed === "boolean" ? a.passed : percent >= passScore;

  return {
    ...a,
    total,
    score,
    passScore,
    percent,
    passed,
    createdAt: Number(a?.createdAt) || Date.now(),
  };
}

function Badge({ ok, children }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold " +
        (ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")
      }
    >
      {children}
    </span>
  );
}

export default function TeacherResults({ onBack }) {
  const tests = useMemo(() => safeArr(getTests?.() || []), []);
  const attemptsRaw = useMemo(() => safeArr(getAttempts?.() || []), []);
  const attempts = useMemo(() => attemptsRaw.map(normalizeAttempt), [attemptsRaw]);

  const [filterTestId, setFilterTestId] = useState("all");

  const filtered = useMemo(() => {
    const list =
      filterTestId === "all"
        ? attempts
        : attempts.filter((a) => String(a?.testId) === String(filterTestId));

    // ✅ الأحدث أولاً
    return [...list].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }, [attempts, filterTestId]);

  const total = filtered.length;
  const passed = filtered.filter((a) => a?.passed).length;
  const avg = total
    ? Math.round(filtered.reduce((s, a) => s + (Number(a?.percent) || 0), 0) / total)
    : 0;

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader compact>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Results (Teacher)</CardTitle>
              <CardDesc>See student attempts and performance</CardDesc>
            </div>
            <Button size="sm" variant="outline" onClick={onBack}>
              Back
            </Button>
          </div>
        </CardHeader>

        <CardContent compact className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-700">Filter by test:</div>
            <select
              className="selectx"
              value={filterTestId}
              onChange={(e) => setFilterTestId(e.target.value)}
            >
              <option value="all">All</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4">
              <div className="text-xs text-slate-500">Attempts</div>
              <div className="text-2xl font-extrabold text-slate-900">{total}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4">
              <div className="text-xs text-slate-500">Passed</div>
              <div className="text-2xl font-extrabold text-slate-900">{passed}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4">
              <div className="text-xs text-slate-500">Average</div>
              <div className="text-2xl font-extrabold text-slate-900">{avg}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="font-bold text-slate-900">No attempts yet</div>
          <div className="text-sm text-slate-500 mt-1">
            Once students take tests, results will appear here.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((a) => (
            <div
              key={a.id ?? `${a.testId}_${a.createdAt}_${a.studentEmail || a.studentName || ""}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-slate-900">{a?.testName || "Test"}</div>
                  <div className="text-xs text-slate-500 mt-1">{fmtDate(a?.createdAt)}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Student: {a?.studentName || a?.studentEmail || "Unknown"}
                  </div>
                </div>
                <Badge ok={!!a?.passed}>{a?.passed ? "PASS" : "FAIL"}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200/60 bg-white/70 p-3">
                  <div className="text-xs text-slate-500">Score</div>
                  <div className="font-bold text-slate-900">
                    {a?.score}/{a?.total} ({a?.percent ?? 0}%)
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/60 bg-white/70 p-3">
                  <div className="text-xs text-slate-500">Passing</div>
                  <div className="font-bold text-slate-900">{a?.passScore ?? 60}%</div>
                </div>
              </div>

              {a?.finishedBy === "timeout" ? (
                <div className="mt-3 text-xs font-semibold text-rose-700">
                  Timeout — auto submitted.
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
