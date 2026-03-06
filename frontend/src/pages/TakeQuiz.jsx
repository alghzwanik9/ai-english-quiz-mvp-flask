import { useState, useEffect, useRef } from "react";
import { fetchStudentTestById, submitStudentTest } from "../services/studentService";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, Button } from "../ui";
import { cn } from "../ui/cn";

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// label extraction (string or object)
function choiceLabel(c) {
  if (c == null) return "";
  if (typeof c === "string") return c.trim();

  if (typeof c === "object") {
    const v =
      c.text ??
      c.label ??
      c.choice ??
      c.value ??
      c.content ??
      c.title ??
      c.name ??
      c.choice_text ??
      c.choiceText ??
      c.option ??
      c.option_text ??
      c.optionText;

    return String(v ?? "").trim();
  }

  return String(c).trim();
}

function choiceKey(c, idx) {
  if (c && typeof c === "object" && c.id != null) return c.id;
  return idx;
}

function normalizeChoices(q) {
  if (Array.isArray(q?.choices)) return q.choices;

  const raw = q?.choices_json ?? q?.choices;
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function TakeQuiz({ onBack, onFinish }) {
  const nav = useNavigate();
  const goBack = () => (typeof onBack === "function" ? onBack() : nav(-1));

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ answers now will store CHOICE TEXT (not index)
  // qid -> "Math"
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const submittedRef = useRef(false);

  const [sp] = useSearchParams();
  const testId = Number(sp.get("testId"));

  const timeLimitSec = Number(test?.timeLimitSec || 0);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec);

  // ✅ load test
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        // ✅ service returns: { test, questions }
        const data = await fetchStudentTestById(testId);

        const apiTest = data?.test ?? null;
        const apiQuestions = safeArr(data?.questions);

        if (!apiTest) throw new Error("API missing test object.");
        if (!apiQuestions.length) throw new Error("API رجّع 0 أسئلة لهذا الاختبار.");

        // block fallback marker
        const hasFallbackMarker = apiQuestions.some((q) =>
          String(q?.question ?? "").includes("[Fallback")
        );
        if (hasFallbackMarker) throw new Error("تم اكتشاف Fallback داخل نص الأسئلة.");

        const questions = apiQuestions.map((q) => ({
          qid: q.qid ?? String(q.id),
          id: q.id,
          type: q.qtype || q.type || "mcq",
          question: q.question,
          choices: normalizeChoices(q),
        }));

        const mapped = {
          id: apiTest.id,
          name: apiTest.name,
          subject: apiTest.subject,
          difficulty: apiTest.difficulty,
          questions,
          timeLimitSec: apiTest.timeLimitSec || 0,
          passScore: apiTest.passScore || 60,
        };

        if (!cancelled) setTest(mapped);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load test.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (Number.isFinite(testId) && testId > 0) {
      load();
    } else {
      setLoading(false);
      setError("Invalid test id.");
    }

    return () => {
      cancelled = true;
    };
  }, [testId]);

  // reset on test change
  useEffect(() => {
    submittedRef.current = false;
    setTimeLeft(timeLimitSec);
    setResult(null);
    setAnswers({});
  }, [testId, timeLimitSec]);

  // countdown
  useEffect(() => {
    if (!test) return;
    if (!timeLimitSec) return;
    if (result) return;

    const t = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        return next <= 0 ? 0 : next;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [test, timeLimitSec, result]);

  // timeout -> auto submit
  useEffect(() => {
    if (!timeLimitSec) return;
    if (result) return;
    if (timeLeft <= 0 && !submittedRef.current) {
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timeLimitSec, result]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 animate-in">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <div className="font-bold text-indigo-400 tracking-widest uppercase text-xs">Preparing Content...</div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto mt-20">
        <div className="text-rose-400 font-bold text-xl mb-2">Access Error</div>
        <p className="text-slate-400 mb-6">
          {error || "We couldn't find the requested assessment. Please check the link or contact your teacher."}
        </p>
        <Button onClick={goBack}>
          Return to Dashboard
        </Button>
      </Card>
    );
  }

  const onChangeAnswer = (qid, choiceText) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [String(qid)]: choiceText }));
  };

  // ✅ REAL SUBMIT to backend
  const submit = async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    try {
      setError("");

      // build payload: { "12": "Math", "13": "..." }
     const payload = {};
safeArr(test.questions).forEach((q) => {
  const key = String(q.qid ?? q.id);      // ✅ استخدم qid
  payload[key] = answers[key] || "";
});


      const res = await submitStudentTest(test.id, payload);
      const percent = Number.isFinite(Number(res?.percent)) ? Math.round(Number(res.percent)) : 0;

      const resObj = {
        id: res?.attempt_id ?? Date.now(),
        testId: test.id,
        testName: test.name,
        score: res?.score ?? 0,
        total: res?.total ?? safeArr(test.questions).length,
        percent,
        finishedBy: auto ? "timeout" : "submit",
        createdAt: Date.now(),
        mode: "graded_backend",
      };

      setResult(resObj);

      if (typeof onFinish === "function") onFinish(resObj);
    } catch (e) {
      // allow retry if failed
      submittedRef.current = false;
      setError(e?.message || "Failed to submit.");
    }
  };

  const reset = () => {
    submittedRef.current = false;
    setResult(null);
    setAnswers({});
    setTimeLeft(timeLimitSec);
  };

  const renderQ = (q, idx) => {
    const t = q.type || "mcq";
    const choices = safeArr(q.choices);
    const selected = answers[String(q.qid)];

    return (
      <div key={q.qid ?? q.id ?? idx} className="glass-card p-6 border-white/10 group hover:border-indigo-500/30 transition-all duration-300">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="text-lg font-bold text-white leading-tight">
            <span className="text-indigo-500 mr-2">Q{idx + 1}.</span> {q.question}
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-white/5 text-slate-400 border border-white/5">
            {t}
          </span>
        </div>

        {t === "mcq" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {choices.length === 0 ? (
              <div className="text-sm text-amber-400 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">No choices provided.</div>
            ) : (
              choices.map((c, cidx) => {
                const label = choiceLabel(c);
                const isActive = String(selected ?? "") === String(label);

                return (
                  <label
                    key={choiceKey(c, cidx)}
                    className={cn(
                      "relative rounded-xl border p-4 flex gap-3 items-center cursor-pointer transition-all duration-200",
                      isActive
                        ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.1)]"
                        : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/10",
                      !!result && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                      isActive ? "bg-indigo-500 border-indigo-500" : "border-slate-500"
                    )}>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                    </div>
                    <input
                      className="hidden"
                      disabled={!!result}
                      type="radio"
                      name={`q_${q.qid}`}
                      checked={isActive}
                      onChange={() => onChangeAnswer(q.qid, label)}
                    />
                    <span className={cn("text-sm font-medium", isActive ? "text-white" : "text-slate-300")}>{label}</span>
                  </label>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between flex-wrap gap-4 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">{test.name}</h1>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>{safeArr(test.questions).length} questions</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className={cn(
               "font-mono font-bold",
               timeLimitSec && timeLeft < 60 ? "text-rose-400" : "text-indigo-400"
            )}>
              {timeLimitSec ? `Time: ${fmtTime(timeLeft)}` : "No time limit"}
            </span>
          </div>
        </div>

        {!result && (
          <Button variant="outline" size="sm" onClick={goBack}>
            Exit Assessment
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {result ? (
        <Card className="p-10 text-center border-indigo-500/30 overflow-visible relative">
           <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-4xl shadow-xl shadow-indigo-500/20 border-4 border-[#020617]">
             🏆
           </div>

           <div className="pt-8 space-y-4">
              <h2 className="text-3xl font-extrabold text-white">Assessment Complete!</h2>
              <div className="flex justify-center gap-8 py-6">
                 <div>
                   <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Score</div>
                   <div className="text-4xl font-extrabold text-indigo-400 tabular-nums">
                     {result.score}<span className="text-lg text-slate-600 ml-1">/{result.total}</span>
                   </div>
                 </div>
                 <div className="w-px bg-white/5" />
                 <div>
                   <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Percentage</div>
                   <div className="text-4xl font-extrabold text-emerald-400 tabular-nums">{result.percent}%</div>
                 </div>
              </div>

              {result.finishedBy === "timeout" && (
                <div className="p-2 px-4 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold uppercase inline-block mx-auto mb-4">
                  Assessment Auto-Submitted (Timeout)
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-6 justify-center">
                <Button className="btn-primary h-12 px-8" onClick={reset}>
                  Try to Improve
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-8"
                  onClick={() => {
                    if (typeof onFinish === "function") onFinish(result);
                    else nav("/student");
                  }}
                >
                  Finish & Exit
                </Button>
              </div>
           </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {safeArr(test.questions).map((q, idx) => renderQ(q, idx))}

          <div className="pt-8 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-white/5 px-2">
            <div className="text-sm text-slate-500 italic">
               Check all your answers before submitting.
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                className="btn-primary h-12 px-12 flex-1 sm:flex-initial"
                onClick={() => submit(false)}
              >
                Submit Assessment
              </Button>
              <Button
                variant="ghost"
                className="h-12 flex-1 sm:flex-initial"
                onClick={goBack}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
