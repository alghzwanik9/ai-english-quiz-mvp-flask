import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function TakeQuiz({ onBack, onFinish }) {
  const { token } = useParams(); // ✅ جاي من /take/:token

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // answers: qid -> selectedIndex
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  // Timer
  const timeLimitSec = Number(test?.timeLimitSec || 0); // 0 = بدون وقت (من الباك لاحقًا)
  const passScore = Number.isFinite(Number(test?.passScore)) ? Number(test.passScore) : 60;

  const [timeLeft, setTimeLeft] = useState(timeLimitSec);
  const submittedRef = useRef(false);

  // ✅ تحميل الاختبار من token
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/student/tests/by-token/${token}`);
        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to load test.");
        }

        const item = data.item;

        // ✅ لا يوجد answers من الباك
        const questions = safeArr(item.questions).map((q) => ({
          id: q.id,
          type: "mcq",
          question: q.question,
          choices: q.choices || [],
        }));

        setTest({
          id: item.id,
          name: item.name,
          subject: item.subject,
          difficulty: item.difficulty,
          questions,
          // (اختياري) لو حبيت تضبطها من الباك لاحقًا
          timeLimitSec: 0,
          passScore: 60,
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load test.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (token) load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // إعادة ضبط عند تغيير الاختبار
  useEffect(() => {
    submittedRef.current = false;
    setTimeLeft(timeLimitSec);
    setResult(null);
    setAnswers({});
  }, [token, timeLimitSec]);

  // عداد تنازلي
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

  // انتهى الوقت → submit تلقائي (بدون تصحيح رسمي)
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="font-bold text-slate-900">Loading...</div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="font-bold text-slate-900">Test not found</div>
        <div className="text-sm text-slate-500 mt-1">
          {error || "Open the test using a valid link."}
        </div>
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
    if (result) return;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  // ✅ مؤقتًا: لا يوجد تصحيح لأننا لا نملك الإجابات
  const submit = async (auto = false) => {
  if (submittedRef.current) return;
  submittedRef.current = true;

  try {
   const res = await fetch(`/api/student/tests/by-token/${token}/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    answers,                 // { [qid]: selectedIndex }
    student_name: me?.name || "",
    student_email: me?.email || "",
  }),
});
const data = await res.json();
if (!res.ok || !data.ok) throw new Error(data?.error || "Submit failed");

const r = data.result;
// هنا استخدم r.score/r.total/r.percent


    const resObj = {
      id: Date.now(),
      testId: r.testId,
      testName: test.name,
      total: r.total,
      score: r.score,
      percent: r.percent,
      passed: r.passed,
      passScore,
      timeLimitSec: timeLimitSec || 0,
      finishedBy: auto ? "timeout" : "submit",
      createdAt: Date.now(),
    };

    setResult(resObj);
  } catch (e) {
    submittedRef.current = false; // يسمح بإعادة المحاولة
    setError(e?.message || "Failed to submit.");
  }

    const qs = safeArr(test.questions);
    const total = qs.length || 0;

    // نعتبر "محاولتك مكتملة" لو جاوبت على كل الأسئلة (اختياري)
    const answeredCount = Object.keys(answers).length;
    const completion = total ? Math.round((answeredCount / total) * 100) : 0;

    const res = {
      id: Date.now(),
      testId: test.id,
      testName: test.name,
      total,
      answered: answeredCount,
      completion,
      percent: completion, // للتوافق مع UI الحالي
      passed: completion >= passScore, // هذا "Completion" مو "Score"
      passScore,
      timeLimitSec: timeLimitSec || 0,
      finishedBy: auto ? "timeout" : "submit",
      createdAt: Date.now(),
      mode: "practice_no_grading",
    };

    setResult(res);
  }

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

        {(t === "mcq") && Array.isArray(q.choices) ? (
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
            {timeLimitSec ? ` · Time: ${fmtTime(timeLeft)}` : " · No time limit"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Note: This link mode does not include grading yet (answers are not sent to the client).
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
          <div className="text-slate-900 font-extrabold text-xl">
            Completed: {result.answered} / {result.total} ({result.completion}%)
          </div>
          <div className="text-sm text-slate-500 mt-1">{result.testName}</div>

          {result.finishedBy === "timeout" ? (
            <div className="text-xs text-rose-600 mt-2 font-semibold">
              Time is up — auto submitted.
            </div>
          ) : null}

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