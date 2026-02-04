import { useMemo, useState, useEffect, useRef } from "react";
import { getTests, addAttempt, getSessionUser } from "../lib/storage";

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function TakeQuiz({ testId, onBack, onFinish }) {
  const test = useMemo(() => {
    const tests = safeArr(getTests());
    return tests.find((t) => String(t.id) === String(testId)) || null;
  }, [testId]);

  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  // ===== Timer config (اختياري داخل الاختبار) =====
  // تقدر تخزنها داخل test:
  // test.timeLimitSec = 600 (10 دقائق)
  // test.passScore = 60 (نجاح من 60%)
  const timeLimitSec = Number(test?.timeLimitSec || 300); // 0 = بدون وقت
  const passScore = Number.isFinite(Number(test?.passScore)) ? Number(test.passScore) : 60;

  const [timeLeft, setTimeLeft] = useState(timeLimitSec);
  const submittedRef = useRef(false);

  // ابدأ المؤقت لما يفتح الاختبار (إذا فيه وقت)
  useEffect(() => {
    submittedRef.current = false;
    setTimeLeft(timeLimitSec);
    setResult(null);
    setAnswers({});
  }, [testId, timeLimitSec]);

  // عداد تنازلي
  useEffect(() => {
  if (!test) return;
  if (!timeLimitSec) return;
  if (result) return; // وقف بعد الإنهاء

  const t = setInterval(() => {
    setTimeLeft((prev) => {
      const next = prev - 1;
      return next <= 0 ? 0 : next;
    });
  }, 1000);

  return () => clearInterval(t);
}, [test, timeLimitSec, result]);


  // انتهى الوقت → submit تلقائي
  useEffect(() => {
    if (!timeLimitSec) return;
    if (result) return;
    if (timeLeft <= 0) {
    if (timeLeft <= 0 && !submittedRef.current) {
   submit(true);
}

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timeLimitSec, result]);

  if (!test) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="font-bold text-slate-900">Test not found</div>
        <div className="text-sm text-slate-500 mt-1">Go back and choose a test.</div>
        <button
          onClick={onBack}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Back
        </button>
      </div>
    );
  }

  const onChangeAnswer = (qid, value) => {
    if (result) return; // منع التعديل بعد الإرسال
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const gradeQuestion = (q) => {
    const t = q.type || "mcq";
    const a = answers[q.id];

    if (t === "mcq" || t === "reading_mcq") {
      const idx = Number(a);
      return Number.isFinite(idx) && idx === Number(q.correctIndex);
    }
    if (t === "tf") {
      const val = a === "true" ? true : a === "false" ? false : null;
      return val !== null && val === Boolean(q.answer);
    }
    if (t === "fill" || t === "reorder") {
      return (
        String(a || "").trim().toLowerCase() ===
        String(q.answer || "").trim().toLowerCase()
      );
    }
    return false;
  };

  const submit = (auto = false) => {
    const me = getSessionUser?.() || null;

    if (submittedRef.current) return; // منع تكرار
    submittedRef.current = true;

    const qs = safeArr(test.questions);
    let score = 0;
    for (const q of qs) if (gradeQuestion(q)) score++;

    const total = qs.length || 0;
    const percent = total ? Math.round((score / total) * 100) : 0;
    const passed = percent >= passScore;

    const res = {
  id: Date.now(), // ✅ مهم

  testId: test.id,
  testName: test.name,
  total,
  score,
  percent,
  passed,
  passScore,
  timeLimitSec: timeLimitSec || 0,
  finishedBy: auto ? "timeout" : "submit",
  createdAt: Date.now(),

  studentName: me?.name || "",
  studentEmail: me?.email || "",
};


    setResult(res);
    addAttempt(res);
  };

  const reset = () => {
    submittedRef.current = false;
    setResult(null);
    setAnswers({});
    setTimeLeft(timeLimitSec);
  };

  const renderQ = (q, idx) => {
    const t = q.type || "mcq";

    return (
      <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="font-semibold text-slate-900">
            {idx + 1}. {q.question}
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
            {t}
          </span>
        </div>

        {q.passage ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-700">
            <div className="text-xs text-slate-500 mb-1">Passage</div>
            <div>{q.passage}</div>
          </div>
        ) : null}

        {(t === "mcq" || t === "reading_mcq") && Array.isArray(q.choices) ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.choices.map((c, cidx) => (
              <label
                key={cidx}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex gap-2 items-start"
              >
                <input
                  disabled={!!result}
                  type="radio"
                  name={`q_${q.id}`}
                  value={cidx}
                  checked={String(answers[q.id] ?? "") === String(cidx)}
                  onChange={(e) => onChangeAnswer(q.id, e.target.value)}
                />
                <span className="text-slate-800">{c}</span>
              </label>
            ))}
          </div>
        ) : null}

        {t === "tf" ? (
          <div className="mt-3 flex gap-2">
            {["true", "false"].map((v) => (
              <label
                key={v}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex gap-2 items-center"
              >
                <input
                  disabled={!!result}
                  type="radio"
                  name={`q_${q.id}`}
                  value={v}
                  checked={String(answers[q.id] ?? "") === v}
                  onChange={(e) => onChangeAnswer(q.id, e.target.value)}
                />
                <span className="text-slate-800">{v === "true" ? "True" : "False"}</span>
              </label>
            ))}
          </div>
        ) : null}

        {(t === "fill" || t === "reorder") ? (
          <div className="mt-3">
            <input
              disabled={!!result}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              placeholder={t === "fill" ? "Type the answer..." : "Type the correct order..."}
              value={answers[q.id] ?? ""}
              onChange={(e) => onChangeAnswer(q.id, e.target.value)}
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-2xl font-extrabold text-slate-900">{test.name}</div>
          <div className="text-sm text-slate-500">
            {safeArr(test.questions).length} questions
            {" · "}
            Passing: {passScore}%
            {timeLimitSec ? ` · Time: ${fmtTime(timeLeft)}` : " · No time limit"}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Body */}
      {result ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-slate-900 font-extrabold text-xl">
                Score: {result.score} / {result.total} ({result.percent}%)
              </div>
              <div className="text-sm text-slate-500 mt-1">{result.testName}</div>
              <div className="text-sm mt-2">
                {result.passed ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-bold">
                    PASS ✅
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-rose-100 text-rose-800 px-3 py-1 font-bold">
                    FAIL ❌
                  </span>
                )}
                <span className="text-slate-500 ml-2">
                  (Need {result.passScore}%)
                </span>
              </div>
              {result.finishedBy === "timeout" ? (
                <div className="text-xs text-rose-600 mt-2 font-semibold">
                  Time is up — auto submitted.
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={reset}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-semibold hover:bg-indigo-700"
            >
              Try Again
            </button>
            <button
              onClick={() => onFinish?.(result)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold hover:bg-slate-50"
            >
              Finish
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {safeArr(test.questions).map((q, idx) => renderQ(q, idx))}

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => submit(false)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-semibold hover:bg-indigo-700"
            >
              Submit
            </button>
            <button
              onClick={onBack}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
