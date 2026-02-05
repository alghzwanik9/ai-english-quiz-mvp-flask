import React, { useState } from "react";
import { Card, Button, Input } from "../ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function StudentLearn() {
  const [subject, setSubject] = useState("English");
  const [topic, setTopic] = useState("");
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    const sub = String(subject || "").trim() || "General";
    const top = String(topic || "").trim();
    if (!top) {
      setError("Enter a topic/lesson title.");
      return;
    }
    setError("");
    setResources(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/learning-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: sub, topic: top }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Failed to load resources");
      }
      setResources(data);
    } catch (e2) {
      setError(e2?.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <Card title="Learning Resources">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., English, Physics..."
            />
            <Input
              label="Topic / Lesson"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Past Simple, Newton's Laws..."
            />
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}

          <Button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Get Explanations"}
          </Button>
        </form>
      </Card>

      {resources && (
        <Card title="Suggested Explanations">
          <div className="space-y-3 text-sm text-slate-800">
            {resources.outline && (
              <div>
                <div className="font-semibold mb-1">Outline</div>
                <div className="whitespace-pre-wrap">{resources.outline}</div>
              </div>
            )}

            {resources.points && Array.isArray(resources.points) && (
              <div>
                <div className="font-semibold mb-1">Key Points</div>
                <ul className="list-disc pl-5 space-y-1">
                  {resources.points.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {resources.examples && Array.isArray(resources.examples) && (
              <div>
                <div className="font-semibold mb-1">Examples</div>
                <ul className="list-disc pl-5 space-y-1">
                  {resources.examples.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {resources.video_ideas && Array.isArray(resources.video_ideas) && (
              <div>
                <div className="font-semibold mb-1">Video Ideas / Search Topics</div>
                <ul className="list-disc pl-5 space-y-1">
                  {resources.video_ideas.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

