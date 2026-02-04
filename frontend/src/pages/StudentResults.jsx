import { useEffect, useMemo, useState } from "react";
import { getAttempts } from "../lib/storage";
import Card, { CardContent, CardDesc, CardHeader, CardTitle } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";

function fmtDate(ms) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
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

export default function StudentResults({ onBack }) {
  const [attempts, setAttempts] = useState(() => {
  const a = getAttempts?.() || [];
  return Array.isArray(a) ? a : [];
});

useEffect(() => {
  const refresh = () => {
    const a = getAttempts?.() || [];
    setAttempts(Array.isArray(a) ? a : []);
  };

  refresh();

  const onCustom = (e) => {
    const key = e?.detail?.key;
    if (!key || key === "results") refresh();
  };
  window.addEventListener("storage_updated", onCustom);

  const onNative = (e) => {
    if (!e?.key || e.key === "results") refresh();
  };
  window.addEventListener("storage", onNative);

  return () => {
    window.removeEventListener("storage_updated", onCustom);
    window.removeEventListener("storage", onNative);
  };
}, []);


  const total = attempts.length;
  const passed = attempts.filter((x) => x?.passed).length;

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader compact>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>My Results</CardTitle>
              <CardDesc>All your quiz attempts</CardDesc>
            </div>
            <Button size="sm" variant="outline" onClick={onBack}>
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent compact className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4">
            <div className="text-xs text-slate-500">Attempts</div>
            <div className="text-2xl font-extrabold text-slate-900">{total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4">
            <div className="text-xs text-slate-500">Passed</div>
            <div className="text-2xl font-extrabold text-slate-900">{passed}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4">
            <div className="text-xs text-slate-500">Pass Rate</div>
            <div className="text-2xl font-extrabold text-slate-900">
              {total ? Math.round((passed / total) * 100) : 0}%
            </div>
          </div>
        </CardContent>
      </Card>

      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="font-bold text-slate-900">No results yet</div>
          <div className="text-sm text-slate-500 mt-1">
            Finish a test and your results will show here.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {attempts.map((a, idx) => {
            const ok = !!a?.passed;
            return (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-slate-900">{a?.testName || "Test"}</div>
                    <div className="text-xs text-slate-500 mt-1">{fmtDate(a?.createdAt)}</div>
                  </div>
                  <Badge ok={ok}>{ok ? "PASS" : "FAIL"}</Badge>
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
                    Time is up — auto submitted.
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
