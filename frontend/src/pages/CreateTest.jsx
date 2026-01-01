import { useMemo, useState } from "react";
import Card, { CardContent, CardDesc, CardHeader, CardTitle } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import { cn } from "../ui/cn";

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

function Field({ label, placeholder, type = "text", hint }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-800 mb-1">{label}</div>
      <input type={type} placeholder={placeholder} className="inputx" />
      {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
    </label>
  );
}

function Select({ label, children, hint }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-800 mb-1">{label}</div>
      <select className="selectx">{children}</select>
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

  const title = useMemo(() => {
    if (tab === "info") return "Test Information";
    if (tab === "manual") return "Add Questions Manually";
    if (tab === "import") return "Import PDF / CSV";
    return "Generate with AI";
  }, [tab]);

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
                <Button size="sm" variant="outline">Upload</Button>
              ) : (
                <Button size="sm" variant="outline">Preview</Button>
              )}
            </div>
          </CardHeader>

          <CardContent compact className="space-y-4">
            {tab === "info" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Test Name" placeholder="e.g., Grammar Basics" />
                <Field label="Material / Subject" placeholder="e.g., Grammar" />
                <Field label="Number of Questions" placeholder="e.g., 10" type="number" />
                <Select label="Difficulty">
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </Select>
                <Select label="Language" hint="Used for instructions & UI hints.">
                  <option>EN</option>
                  <option>AR</option>
                  <option>EN + AR</option>
                </Select>
                <Select label="Question Type">
                  <option>MCQ</option>
                  <option>True / False</option>
                  <option>Mixed</option>
                </Select>
              </div>
            )}

            {tab === "manual" && (
              <div className="space-y-4">
                <Field label="Question Text" placeholder="Write the question..." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Option A" placeholder="A..." />
                  <Field label="Option B" placeholder="B..." />
                  <Field label="Option C" placeholder="C..." />
                  <Field label="Option D" placeholder="D..." />
                </div>

                <Select label="Correct Answer">
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                  <option>D</option>
                </Select>

                <Field label="Explanation (optional)" placeholder="Short explanation..." />
                <div className="flex flex-wrap gap-2">
                  <Button>Add Question</Button>
                  <Button variant="outline">Clear</Button>
                </div>

                <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 text-sm text-slate-600">
                  Tip: Keep questions short and avoid ambiguous options.
                </div>
              </div>
            )}

            {tab === "import" && (
              <div className="space-y-4">
                <UploadBox />
                <div className="text-sm text-slate-600">
                  After importing, we will show an <b>Imports Review</b> page to edit questions before saving.
                </div>
                <Button size="sm" variant="outline">Go to Imports Review</Button>
              </div>
            )}

            {tab === "ai" && (
              <div className="space-y-4">
                <Field label="Topic" placeholder="e.g., Past Tense / Travel Vocabulary" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Questions Count" placeholder="e.g., 10" type="number" />
                  <Select label="Generation Style">
                    <option>Balanced</option>
                    <option>Simple</option>
                    <option>Challenging</option>
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
            <MiniRow label="Status" value="Draft" />
            <MiniRow label="Questions" value="0" />
            <MiniRow label="Language" value="EN/AR" />
            <MiniRow label="Mode" value={tab.toUpperCase()} />

            <div className="pt-2 grid grid-cols-1 gap-2">
           <Button className="w-full">Save Test</Button>
           <Button className="w-full" variant="outline">Cancel</Button>
         </div>


            <div className="text-xs text-slate-500 pt-2">
              Save will store the draft locally for now (DB later).
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
