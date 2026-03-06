import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Input, Button, Select, cn } from "../ui";
import { createTeacherTest, importQuestionsWithAI } from "../services/teacherService";

function makeEmptyQuestion() {
  return {
    question: "",
    choices: ["", "", "", ""],
    answer: "",
    explanation: "",
  };
}

function normalizeQuestions(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((q) => {
      const question = String(q?.question || "").trim();
      const choices = Array.isArray(q?.choices)
        ? q.choices.map((c) => String(c || "").trim()).filter(Boolean)
        : [];
      const explanation = String(q?.explanation || "").trim();
      let answer = String(q?.answer || "").trim();

      if (!question || choices.length < 2) return null;
      if (!answer || !choices.includes(answer)) answer = choices[0];

      return { question, choices, answer, explanation };
    })
    .filter(Boolean);
}

function parseMcqText(raw) {
  const text = String(raw || "").replace(/\r/g, "").trim();
  if (!text) return [];

  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const out = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 3) continue;

    const qLine = lines[0].replace(/^\d+\s*[\)\.\-]\s*/, "").trim();
    if (!qLine) continue;

    const choiceLines = [];
    let answerLine = "";

    for (let i = 1; i < lines.length; i += 1) {
      const ln = lines[i];

      if (/^(answer|ans)\s*[:\-]/i.test(ln) || /^الإجابة\s*[:\-]/.test(ln)) {
        answerLine = ln;
        break;
      }

      choiceLines.push(ln);
    }

    const choices = choiceLines
      .map((c) => c.replace(/^[A-Da-d١-٤]\s*[\)\.\-:]\s*/, "").trim())
      .filter(Boolean);

    if (choices.length < 2) continue;

    let answer = "";
    if (answerLine) {
      const m = answerLine.match(/[:\-]\s*(.+)$/);
      const tail = (m?.[1] || "").trim();

      const letter = tail.match(/^[A-Da-d]$/)?.[0]?.toUpperCase() || null;
      if (letter) {
        const idx = letter.charCodeAt(0) - "A".charCodeAt(0);
        answer = choices[idx] || "";
      } else {
        answer = tail;
      }
    }

    if (!answer || !choices.includes(answer)) answer = choices[0];

    out.push({
      question: qLine,
      choices,
      answer,
      explanation: "",
    });
  }

  return out;
}

function Tabs({ value, onChange }) {
  const items = [
    { key: "generate", label: "AI Generated" },
    { key: "manual", label: "Manual" },
  ];

  return (
    <div className="inline-flex flex-wrap gap-2 p-1 rounded-md bg-zinc-100 border border-black/5 shadow-inner">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "rounded px-6 py-2 text-sm font-black transition-all duration-200",
              active
                ? "bg-black text-white shadow-sm"
                : "text-zinc-500 hover:text-black hover:bg-white"
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function normalizeChoicesForSelect(choices) {
  const cleaned = (choices || []).map((c) => String(c || "").trim()).filter(Boolean);
  if (cleaned.length === 0) return [""];
  return cleaned;
}

function QuestionEditor({ questions, setQuestions }) {
  const updateQ = (idx, patch) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateChoice = (qIdx, cIdx, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const next = Array.isArray(q.choices) ? [...q.choices] : [];
        next[cIdx] = value;
        return { ...q, choices: next };
      })
    );
  };

  const addChoice = (qIdx) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const next = Array.isArray(q.choices) ? [...q.choices, ""] : [""];
        return { ...q, choices: next };
      })
    );
  };

  const removeChoice = (qIdx, cIdx) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const next = (Array.isArray(q.choices) ? q.choices : []).filter((_, j) => j !== cIdx);
        const cleaned = next.length ? next : [""];
        let answer = String(q.answer || "");
        if (answer && !cleaned.includes(answer)) answer = cleaned[0] || "";
        return { ...q, choices: cleaned, answer };
      })
    );
  };

  const addQuestion = () => setQuestions((prev) => [...prev, makeEmptyQuestion()]);
  const removeQuestion = (idx) => setQuestions((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => {
        const choices = Array.isArray(q.choices) ? q.choices : [];
        const normalizedChoices = choices.map((c) => String(c || ""));
        const answer = String(q.answer || "");

        return (
          <div key={qi} className="modern-card p-8 bg-white border border-black relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-black" />
            
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="text-xl font-black text-black tracking-tighter">QUESTION #{qi + 1}</div>
              {questions.length > 1 ? (
                <button 
                   type="button" 
                   className="text-zinc-400 hover:text-black font-black text-xs uppercase tracking-widest transition-colors" 
                   onClick={() => removeQuestion(qi)}
                >
                  [ REMOVE QUESTION ]
                </button>
              ) : null}
            </div>

            <div className="space-y-8">
              <Input
                label="Question Statement"
                placeholder="What would you like to ask?"
                className="min-h-[100px] border-black text-lg font-black"
                as="textarea"
                value={q.question}
                onChange={(e) => updateQ(qi, { question: e.target.value })}
              />

              <div className="space-y-6">
                <div className="text-[10px] uppercase font-black text-zinc-400 tracking-widest">Options</div>
                <div className="grid md:grid-cols-2 gap-5">
                  {normalizedChoices.map((c, ci) => (
                    <div key={ci} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <Input
                          placeholder={`Option ${String.fromCharCode(65 + ci)}`}
                          value={c}
                          onChange={(e) => updateChoice(qi, ci, e.target.value)}
                          className="bg-zinc-50 border-zinc-300 focus:bg-white focus:border-black"
                        />
                      </div>
                      <button
                        type="button"
                        className="p-2 text-zinc-300 hover:text-black transition-colors"
                        onClick={() => removeChoice(qi, ci)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex">
                  <Button className="btn-secondary font-black text-xs uppercase" onClick={() => addChoice(qi)}>
                    + Add Option
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 pt-8 border-t border-zinc-100">
                <Select
                  label="Correct Answer"
                  value={answer}
                  onChange={(e) => updateQ(qi, { answer: e.target.value })}
                  className="border-black"
                >
                  {(normalizeChoicesForSelect(normalizedChoices) || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>

                <Input 
                  label="Explanation (Optional)" 
                  placeholder="Why is this correct?" 
                  value={q.explanation} 
                  onChange={(e) => updateQ(qi, { explanation: e.target.value })}
                  className="border-black"
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-4 pt-4">
        <Button className="btn-secondary px-8 font-black uppercase tracking-widest" onClick={addQuestion}>
          + Initiate New Question
        </Button>
      </div>

      <div className="p-4 rounded-md bg-zinc-100 text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center border border-zinc-200">
        Incomplete questions will be omitted during preservation.
      </div>
    </div>
  );
}

export default function CreateTest() {
  const nav = useNavigate();

  const [tab, setTab] = useState("generate");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [testId, setTestId] = useState(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("General");
  const [difficulty, setDifficulty] = useState("easy");
  const [topic, setTopic] = useState("");

  const [questions, setQuestions] = useState([makeEmptyQuestion()]);

  const [aiText, setAiText] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiCount, setAiCount] = useState(5);

  const [importRaw, setImportRaw] = useState("");

  const validQuestions = useMemo(() => {
    return normalizeQuestions(questions);
  }, [questions]);

  async function ensureTestExists() {
    if (testId) return testId;

    const n = String(name || "").trim();
    if (!n) throw new Error("Test title required");

    const created = await createTeacherTest({
      name: n,
      subject: String(subject || "General").trim(),
      difficulty: String(difficulty || "easy").trim().toLowerCase(),
      questions: [],
    });

    if (!created?.id) throw new Error("Failed to secure Draft ID");
    setTestId(created.id);
    return created.id;
  }

  async function handleGenerate() {
    setBusy(true);
    setMsg("");
    try {
      const n = String(name || "").trim();
      const s = String(subject || "").trim();
      const t = String(topic || "").trim();

      if (!n || !s || !t || !aiText.trim()) throw new Error("Missing generation parameters");

      const tid = await ensureTestExists();

      const data = await importQuestionsWithAI({
        test_id: tid,
        material: subject,
        topic: t,
        text: aiText,
        difficulty: aiDifficulty,
        count: Number(aiCount) || 5,
        save: true,
      });

      const imported = normalizeQuestions(data?.questions || []);
      if (!imported.length) throw new Error("Zero questions generated");

      setQuestions(
        imported.map((q) => ({
          question: q.question,
          choices: q.choices.length ? q.choices : ["", "", "", ""],
          answer: q.answer,
          explanation: q.explanation || "",
        }))
      );

      setMsg(`Success ✅ (${imported.length} Q) | ID: ${tid}`);
      setTab("manual");
    } catch (e) {
      setMsg(e?.message || "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  function handleImport() {
    setMsg("");
    const parsed = parseMcqText(importRaw);
    if (!parsed.length) {
      setMsg("Invalid format");
      return;
    }

    const normalized = normalizeQuestions(parsed);
    setQuestions(
      normalized.map((q) => ({
        question: q.question,
        choices: q.choices.length ? q.choices : ["", "", "", ""],
        answer: q.answer,
        explanation: q.explanation || "",
      }))
    );
    setTab("manual");
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const n = String(name || "").trim();
      if (!n || !validQuestions.length) throw new Error("Validation failed");

      if (testId) {
        setMsg("✅ Draft secured. Navigating to results.");
        nav(`/teacher/results?testId=${testId}`, { replace: true });
        return;
      }

      const payloadQuestions = validQuestions.map((q) => ({
        question: q.question,
        choices: q.choices,
        answer: q.choices.includes(q.answer) ? q.answer : q.choices[0],
        explanation: q.explanation || "",
      }));

      const created = await createTeacherTest({
        name: n,
        subject: String(subject || "General").trim(),
        difficulty: String(difficulty || "easy").trim(),
        questions: payloadQuestions,
      });

      nav(`/teacher/results?testId=${created.id}`, { replace: true });
    } catch (e2) {
      setMsg(e2?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 animate-in pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase">Create Assessment</h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Manual builder & AI Generation</p>
        </div>
        <Button variant="outline" className="btn-secondary h-10 px-6 uppercase font-black text-xs" onClick={() => nav("/teacher")}>
          [ DASHBOARD ]
        </Button>
      </div>

      {msg ? (
        <div className="p-4 bg-zinc-100 border border-black/10 text-xs font-black uppercase tracking-widest">
           {msg}
        </div>
      ) : null}

      {testId ? (
        <div className="p-4 bg-black text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          ACTIVE DRAFT ID: {testId} | AUTO-SYNC ENABLED
        </div>
      ) : null}

      <Card className="p-8 border-black shadow-none ring-1 ring-black/5" title="TEST DATA">
        <form className="space-y-8" onSubmit={handleSave}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Input label="TITLE" placeholder="Grammar 101" value={name} onChange={(e) => setName(e.target.value)} className="border-black font-black" />
            <Input label="SUBJECT" value={subject} onChange={(e) => setSubject(e.target.value)} className="border-black font-black" />
            <Input label="TOPIC" value={topic} onChange={(e) => setTopic(e.target.value)} className="border-black font-black" />
            <Select label="DIFFICULTY" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="border-black font-black">
              <option value="easy">EASY</option>
              <option value="medium">MEDIUM</option>
              <option value="hard">HARD</option>
            </Select>
          </div>
  
          <div className="pt-8 border-t border-black/5 flex gap-4">
            <Button className="btn-primary h-12 px-10 font-black uppercase tracking-widest text-sm" type="submit" disabled={busy}>
              {busy ? "PROGRESSING..." : "COMMIT ASSESSMENT"}
            </Button>
            <Button className="btn-secondary h-12 px-6 font-black uppercase tracking-widest text-xs" type="button" onClick={() => setQuestions([makeEmptyQuestion()])}>
              RESET
            </Button>
          </div>
        </form>
      </Card>

      <div className="p-6 border border-black bg-white space-y-6">
        <div className="flex items-center gap-4">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Creation Mode</div>
          <Tabs value={tab} onChange={setTab} />
        </div>

        {tab === "generate" ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Select label="AI LEVEL" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className="border-black font-black">
                  <option value="easy">EASY</option>
                  <option value="medium">MEDIUM</option>
                  <option value="hard">HARD</option>
                </Select>
                <Input label="COUNT" type="number" value={aiCount} onChange={(e) => setAiCount(e.target.value)} className="border-black font-black" />
              </div>

              <Input
                label="SOURCE MATERIAL"
                as="textarea"
                className="min-h-[200px] border-black font-medium"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Paste content for AI processing..."
              />

              <Button className="btn-primary w-full h-12 font-black uppercase tracking-widest" onClick={handleGenerate} disabled={busy}>
                {busy ? "GENERATING..." : "START AI GENERATION"}
              </Button>
            </div>

            <div className="p-8 bg-zinc-50 border border-black/5 flex flex-col justify-center">
              <div className="text-[10px] font-black text-black/40 uppercase tracking-[0.3em] mb-4">Documentation</div>
              <div className="space-y-4 text-xs font-bold text-black uppercase leading-loose tracking-widest">
                <p>• Long material &gt; High precision</p>
                <p>• Auto-switches to manual mode for review</p>
                <p>• Unique ID assigned per generation</p>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "manual" ? (
          <div className="space-y-6">
            <div className="p-8 border border-black/10 bg-zinc-50 space-y-5">
              <Input
                label="BULK ENTRY"
                as="textarea"
                className="min-h-[150px] border-black"
                value={importRaw}
                onChange={(e) => setImportRaw(e.target.value)}
                placeholder="Q) Text? A) Option B) Option Ans: A"
              />
              <Button className="btn-secondary px-8 font-black text-xs uppercase" onClick={handleImport} disabled={busy}>
                [ PARSE INPUT ]
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 ml-1">
           <div className="w-1 h-3 bg-black" />
           <div className="text-xs font-black uppercase tracking-widest">Question Archive</div>
        </div>
        <QuestionEditor questions={questions} setQuestions={setQuestions} />
      </div>
    </div>
  );
}
