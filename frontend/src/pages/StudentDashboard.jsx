import React, { useMemo, useState } from "react";
import AuthNavbar from "../components/AuthNavbar";
import { Card, Button, Select } from "../components/ui";
import { getTests, addAttempt, getAttempts } from "../lib/storage";

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

export default function StudentDashboard() {
  const [tests] = useState(() => getTests());
  const testsSafe = safeArr(tests);

  const [selectedTestId, setSelectedTestId] = useState(
    testsSafe[0]?.id ? String(testsSafe[0].id) : ""
  );
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const selectedTest = useMemo(() => {
    const idNum = Number(selectedTestId);
    return testsSafe.find((t) => Number(t.id) === idNum) || null;
  }, [testsSafe, selectedTestId]);

  const onChangeAnswer = (qid, value) => {
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
    if (t === "fill") {
      return (
        String(a || "").trim().toLowerCase() ===
        String(q.answer || "").trim().toLowerCase()
      );
    }
    if (t === "reorder") {
      return (
        String(a || "").trim().toLowerCase() ===
        String(q.answer || "").trim().toLowerCase()
      );
    }
    return false;
  };

  const submit = () => {
    if (!selectedTest) return;

    const qs = safeArr(selectedTest.questions);
    let score = 0;
    for (const q of qs) if (gradeQuestion(q)) score++;

    const res = {
      testId: selectedTest.id,
      testName: selectedTest.name,
      total: qs.length,
      score,
      createdAt: Date.now(),
    };

    setResult(res);
    addAttempt(res);
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
  };

  const attempts = useMemo(() => getAttempts(), [result]);

  const renderQ = (q) => {
    const t = q.type || "mcq";

    return (
      <div key={q.id} className="cardx">
        <div className="cardx-b">
          <div className="flex items-start justify-between gap-3">
            <div className="font-semibold text-slate-900">{q.question}</div>
            <span className="pill pill-active">{t}</span>
          </div>

          {q.passage ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-slate-700">
              <div className="text-xs text-slate-500 mb-1">Passage</div>
              <div>{q.passage}</div>
            </div>
          ) : null}

          {(t === "mcq" || t === "reading_mcq") && Array.isArray(q.choices) ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.choices.map((c, idx) => (
                <label
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex gap-2 items-start"
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={idx}
                    checked={String(answers[q.id] ?? "") === String(idx)}
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
                    type="radio"
                    name={`q_${q.id}`}
                    value={v}
                    checked={String(answers[q.id] ?? "") === v}
                    onChange={(e) => onChangeAnswer(q.id, e.target.value)}
                  />
                  <span className="text-slate-800">
                    {v === "true" ? "True" : "False"}
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {(t === "fill" || t === "reorder") ? (
            <div className="mt-3">
              <input
                className="inputx"
                placeholder={
                  t === "fill" ? "Type the answer..." : "Type the correct order..."
                }
                value={answers[q.id] ?? ""}
                onChange={(e) => onChangeAnswer(q.id, e.target.value)}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      <AuthNavbar />


      <div className="mt-6 space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="h1">Student Dashboard</div>
            <div className="muted">Choose a test and answer the questions.</div>
          </div>

          <div className="w-full sm:w-80">
            <Select
              label="Selected Test"
              value={selectedTestId}
              onChange={(e) => {
                setSelectedTestId(e.target.value);
                reset();
              }}
            >
              {testsSafe.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!selectedTest ? (
          <Card title="No tests">
            <div className="muted">Ask the teacher to create a test first.</div>
          </Card>
        ) : (
          <>
            {result ? (
              <Card title="Result">
                <div className="text-slate-900 font-semibold">
                  Score: {result.score} / {result.total}
                </div>
                <div className="muted mt-1">{result.testName}</div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={reset}>Try Again</Button>
                </div>
              </Card>
            ) : (
              <Card title="Test">
                <div className="muted mb-3">
                  {selectedTest.name} • {safeArr(selectedTest.questions).length} questions
                </div>

                <div className="space-y-3">{safeArr(selectedTest.questions).map(renderQ)}</div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={submit}>Submit</Button>
                  <Button variant="ghost" onClick={reset}>
                    Reset
                  </Button>
                </div>
              </Card>
            )}

            <Card title="Recent Attempts (local)">
              {attempts.length === 0 ? (
                <div className="muted">No attempts yet.</div>
              ) : (
                <div className="space-y-2">
                  {attempts.slice(0, 10).map((a, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="font-semibold text-slate-900">
                        {a.testName} — {a.score}/{a.total}
                      </div>
                      <div className="muted">
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
