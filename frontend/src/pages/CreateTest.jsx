import { useMemo, useState } from "react";
import Card, { CardContent, CardDesc, CardHeader, CardTitle } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import { cn } from "../ui/cn";
import { upsertTest } from "../lib/storage";
import { createTeacherTest, importQuestionsWithAI } from "../services/teacherService";

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-xl text-sm font-semibold transition border",
        active
          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
          : "bg-white/70 text-slate-700 border-slate-200/60 hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, placeholder, type = "text", hint, value, onChange }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-800 mb-1">{label}</div>
      <input
        type={type}
        placeholder={placeholder}
        className="inputx"
        value={value ?? ""}
        onChange={onChange}
      />
      {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
    </label>
  );
}

function Select({ label, children, hint, value, onChange }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-800 mb-1">{label}</div>
      <select className="selectx" value={value ?? ""} onChange={onChange}>
        {children}
      </select>
      {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
    </label>
  );
}

function UploadBox() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/70 p-6">
      <div className="font-bold text-slate-900">Upload PDF or CSV</div>
      <div className="text-sm text-slate-600 mt-1">Drop your file here, or click to browse.</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm">Choose File</Button>
        <Button size="sm" variant="outline">Upload</Button>
      </div>
      <div className="mt-3 text-xs text-slate-500">Supported: PDF, CSV • Max 10MB</div>
    </div>
  );
}

function MiniRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/70 border border-slate-200/60 px-4 py-3">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function CreateTest() {
  const [tab, setTab] = useState("info"); // info | manual | import | ai

  const [testId, setTestId] = useState(null);
  const [testName, setTestName] = useState("");
  const [material, setMaterial] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("Easy");
  const [language, setLanguage] = useState("EN");
  const [questionType, setQuestionType] = useState("MCQ");

  // settings
  const [timeLimitMin, setTimeLimitMin] = useState(0);
  const [passScore, setPassScore] = useState(60);

  // manual question inputs
  const [questions, setQuestions] = useState([]);
  const [qText, setQText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correct, setCorrect] = useState("A");
  const [explain, setExplain] = useState("");

  const [saveMsg, setSaveMsg] = useState("");
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  const title = useMemo(() => {
    if (tab === "info") return "Test Information";
    if (tab === "manual") return "Add Questions Manually";
    if (tab === "import") return "Import PDF / CSV";
    return "Generate with AI";
  }, [tab]);

  const safePass = Math.min(100, Math.max(0, Number(passScore) || 0));
  const safeMin = Math.max(0, Number(timeLimitMin) || 0);

  const buildTestObject = (idOverride = null) => {
    const id = idOverride ?? testId ?? Date.now();
    return {
      id,
      name: String(testName || "").trim(),
      material: String(material || "").trim(),
      difficulty,
      language,
      questionType,
      questions: Array.isArray(questions) ? questions : [],
      timeLimitSec: safeMin * 60,
      passScore: safePass,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
  };

  const onSave = async (goManualAfter = false) => {
    const name = String(testName || "").trim();
    if (!name) {
      setSaveMsg("Please enter Test Name.");
      setTab("info");
      return;
    }

    const t = buildTestObject();

    // حفظ في الباكند (اختبار فعلي) + تخزين محلي كـ draft/نسخة كاش
    try {
      if (Array.isArray(questions) && questions.length) {
        await createTeacherTest({
          name: t.name,
          subject: t.material,
          difficulty: String(difficulty || "easy").toLowerCase(),
          questions: questions.map((q) => ({
            question: q.question,
            choices: q.choices,
            answer: q.choices?.[Number(q.correctIndex) || 0],
            explanation: q.explanation,
          })),
        });
      }
    } catch (e) {
      // ما نكسر التجربة لو الباكند فشل، بس نعرض رسالة خفيفة
      setSaveMsg(e?.message || "Saved locally. Backend save failed.");
    }

    const stored = upsertTest(t);
    setTestId(stored.id);
    setSaveMsg("Saved ✅");
    if (goManualAfter) setTab("manual");
  };

  const clearManual = () => {
    setQText("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrect("A");
    setExplain("");
  };

  const addQuestion = () => {
    const qt = String(qText || "").trim();
    if (!qt) return setSaveMsg("Write Question Text first.");

    const choices = [optA, optB, optC, optD].map((x) => String(x || "").trim());
    const filled = choices.filter((c) => c.length > 0);

    if (filled.length < 2) return setSaveMsg("Add at least 2 options.");
    if (!choices[0] || !choices[1]) return setSaveMsg("Option A and B are required.");

    const map = { A: 0, B: 1, C: 2, D: 3 };
    const correctIndex = map[correct] ?? 0;
    if (!choices[correctIndex]) return setSaveMsg("Correct option is empty.");

    const q = {
      id: Date.now(),
      type: "mcq",
      question: qt,
      choices,
      correctIndex,
      explanation: String(explain || "").trim(),
    };

    const next = [q, ...(Array.isArray(questions) ? questions : [])];
    setQuestions(next);
    setSaveMsg("Question added ✅");

    // auto-save if test has name
    const name = String(testName || "").trim();
    if (name) {
      const id = testId ?? Date.now();
      setTestId(id);
      const t = buildTestObject(id);
      t.questions = next;
      upsertTest(t);
    }

    clearManual();
  };

  const removeQuestion = (qid) => {
    const next = (Array.isArray(questions) ? questions : []).filter((q) => String(q.id) !== String(qid));
    setQuestions(next);

    const name = String(testName || "").trim();
    if (name && testId) {
      const t = buildTestObject(testId);
      t.questions = next;
      upsertTest(t);
      setSaveMsg("Question removed ✅");
    }
  };

  const onCancel = () => {
    setTestId(null);
    setTestName("");
    setMaterial("");
    setNumQuestions(10);
    setDifficulty("Easy");
    setLanguage("EN");
    setQuestionType("MCQ");
    setTimeLimitMin(0);
    setPassScore(60);
    setQuestions([]);
    clearManual();
    setSaveMsg("");
    setTab("info");
  };

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader compact>
          <CardTitle>Create Test</CardTitle>
          <CardDesc>Build a new test step-by-step with a clean workflow</CardDesc>
        </CardHeader>
        <CardContent compact>
          <div className="flex flex-wrap gap-2">
            <TabButton active={tab === "info"} onClick={() => setTab("info")}>Info</TabButton>
            <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>Manual</TabButton>
            <TabButton active={tab === "import"} onClick={() => setTab("import")}>Import</TabButton>
            <TabButton active={tab === "ai"} onClick={() => setTab("ai")}>AI</TabButton>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card variant="glass" className="lg:col-span-8">
          <CardHeader compact>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDesc>Fill the details below</CardDesc>
              </div>

              {tab === "ai" ? (
                <Button size="sm">Generate</Button>
              ) : tab === "import" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={importLoading}
                  onClick={async () => {
                    const text = String(importText || "").trim();
                    const mat = String(material || "").trim() || "General";
                    if (!text) {
                      setSaveMsg("Paste lesson text to import questions.");
                      return;
                    }
                    setSaveMsg("");
                    setImportLoading(true);
                    try {
                      const res = await importQuestionsWithAI({
                        material: mat,
                        text,
                        difficulty: String(difficulty || "easy").toLowerCase(),
                        count: Number(numQuestions) || 10,
                        save: false,
                      });
                      const imported = (res.questions || []).map((q) => ({
                        id: Date.now() + Math.random(),
                        type: "mcq",
                        question: q.question,
                        choices: q.choices,
                        correctIndex: Math.max(
                          0,
                          (q.choices || []).findIndex((c) => c === q.answer)
                        ),
                        explanation: q.explanation || "",
                      }));
                      if (!imported.length) {
                        setSaveMsg("No questions returned from AI.");
                        return;
                      }
                      setQuestions(imported);
                      setTab("manual");
                      setSaveMsg(`Imported ${imported.length} questions ✅`);
                    } catch (e) {
                      setSaveMsg(e?.message || "Failed to import questions.");
                    } finally {
                      setImportLoading(false);
                    }
                  }}
                >
                  {importLoading ? "Importing..." : "Import with AI"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => onSave(true)}>Preview</Button>
              )}
            </div>
          </CardHeader>

          <CardContent compact className="space-y-4">
            {tab === "info" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Test Name" placeholder="e.g., Grammar Basics" value={testName} onChange={(e) => setTestName(e.target.value)} />
                <Field label="Material / Subject" placeholder="e.g., Grammar" value={material} onChange={(e) => setMaterial(e.target.value)} />
                <Field label="Number of Questions" placeholder="e.g., 10" type="number" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value || 0))} />

                {/* settings */}
                <Field label="Time Limit (minutes)" placeholder="0 = No time limit" type="number" value={timeLimitMin} onChange={(e) => setTimeLimitMin(Number(e.target.value || 0))} />
                <Field label="Passing Score (%)" placeholder="e.g., 60" type="number" hint="0–100" value={passScore} onChange={(e) => setPassScore(Number(e.target.value || 0))} />

                <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </Select>

                <Select label="Language" hint="Used for instructions & UI hints." value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option>EN</option><option>AR</option><option>EN + AR</option>
                </Select>

                <Select label="Question Type" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                  <option>MCQ</option><option>True / False</option><option>Mixed</option>
                </Select>
              </div>
            )}

            {tab === "manual" && (
              <div className="space-y-4">
                <Field label="Question Text" placeholder="Write the question..." value={qText} onChange={(e) => setQText(e.target.value)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Option A" placeholder="A..." value={optA} onChange={(e) => setOptA(e.target.value)} />
                  <Field label="Option B" placeholder="B..." value={optB} onChange={(e) => setOptB(e.target.value)} />
                  <Field label="Option C" placeholder="C..." value={optC} onChange={(e) => setOptC(e.target.value)} />
                  <Field label="Option D" placeholder="D..." value={optD} onChange={(e) => setOptD(e.target.value)} />
                </div>

                <Select label="Correct Answer" value={correct} onChange={(e) => setCorrect(e.target.value)}>
                  <option>A</option><option>B</option><option>C</option><option>D</option>
                </Select>

                <Field label="Explanation (optional)" placeholder="Short explanation..." value={explain} onChange={(e) => setExplain(e.target.value)} />

                <div className="flex flex-wrap gap-2">
                  <Button onClick={addQuestion}>Add Question</Button>
                  <Button variant="outline" onClick={clearManual}>Clear</Button>
                  <Button variant="outline" onClick={() => onSave(false)}>Save Draft</Button>
                </div>

                {questions.length ? (
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-slate-900">Questions Preview</div>
                    {questions.slice(0, 6).map((q) => (
                      <div key={q.id} className="rounded-2xl border border-slate-200/60 bg-white/60 p-3 text-sm">
                        <div className="font-semibold text-slate-900">{q.question}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Correct: {["A", "B", "C", "D"][Number(q.correctIndex) || 0]}
                        </div>
                        <div className="mt-2">
                          <button className="text-xs font-bold text-rose-700 hover:underline" onClick={() => removeQuestion(q.id)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {questions.length > 6 ? <div className="text-xs text-slate-500">+ {questions.length - 6} more…</div> : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 text-sm text-slate-600">
                    Tip: Add questions here. Save Draft anytime.
                  </div>
                )}
              </div>
            )}

            {tab === "import" && (
              <div className="space-y-4">
                <UploadBox />
                <div className="text-sm text-slate-600">
                  Or paste the lesson/content text below and let AI suggest questions for you.
                </div>
                <label className="block">
                  <div className="text-sm font-semibold text-slate-800 mb-1">Lesson Text</div>
                  <textarea
                    className="inputx min-h-[140px] resize-vertical"
                    placeholder="Paste the lesson or material text here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                </label>
              </div>
            )}

            {tab === "ai" && (
              <div className="space-y-4">
                <Field label="Topic" placeholder="e.g., Past Tense / Travel Vocabulary" value={""} onChange={() => {}} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Questions Count" placeholder="e.g., 10" type="number" value={""} onChange={() => {}} />
                  <Select label="Generation Style" value={"Balanced"} onChange={() => {}}>
                    <option>Balanced</option><option>Simple</option><option>Challenging</option>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button>Generate with AI</Button>
                  <Button variant="outline">Preview</Button>
                </div>

                <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 text-sm text-slate-600">
                  Tip: Later we can add bilingual feedback (AR/EN) in the student review.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="glass" className="lg:col-span-4">
          <CardHeader compact>
            <CardTitle>Summary</CardTitle>
            <CardDesc>Quick overview before saving</CardDesc>
          </CardHeader>

          <CardContent compact className="space-y-3">
            <MiniRow label="Status" value={testId ? "Draft (Saved)" : "Draft"} />
            <MiniRow label="Questions" value={String(questions.length)} />
            <MiniRow label="Language" value={language} />
            <MiniRow label="Mode" value={tab.toUpperCase()} />
            <MiniRow label="Time" value={Number(timeLimitMin) ? `${timeLimitMin} min` : "No limit"} />
            <MiniRow label="Pass" value={`${safePass}%`} />

            <div className="pt-2 grid grid-cols-1 gap-2">
              <Button className="w-full" onClick={() => onSave(false)}>Save Test</Button>
              <Button className="w-full" variant="outline" onClick={onCancel}>Cancel</Button>
            </div>

            {saveMsg ? <div className="text-xs font-semibold text-slate-700 pt-1">{saveMsg}</div> : null}

            <div className="text-xs text-slate-500 pt-2">
              Save will store a local draft and try to sync with the backend database.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
