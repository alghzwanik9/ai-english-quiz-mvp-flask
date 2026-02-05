import React, { useState } from "react";
import { Card, Button } from "../ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function StudentSummarize() {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    const t = String(text || "").trim();
    if (!t) {
      setError("Paste some text to summarize.");
      return;
    }
    setError("");
    setSummary("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Failed to summarize");
      }
      setSummary(data.summary || "");
    } catch (e2) {
      setError(e2?.message || "Failed to summarize");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <Card title="Summarize Material">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <div className="text-sm font-semibold text-slate-800 mb-1">
              Material / Lesson Text
            </div>
            <textarea
              className="w-full min-h-[200px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 resize-vertical"
              placeholder="Paste the material or lesson text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          {error && <div className="text-sm text-rose-600">{error}</div>}

          <Button type="submit" disabled={loading}>
            {loading ? "Summarizing..." : "Summarize"}
          </Button>
        </form>
      </Card>

      {summary && (
        <Card title="Summary">
          <div className="whitespace-pre-wrap text-sm text-slate-800">
            {summary}
          </div>
        </Card>
      )}
    </div>
  );
}

