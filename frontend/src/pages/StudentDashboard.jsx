import React, { useEffect, useMemo, useState } from "react";
import { Card, Button, Select } from "../ui";
import { fetchStudentTests } from "../services/studentService";
import { setTests as saveTests, getTests } from "../lib/storage";

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

export default function StudentDashboard({ onStart }) {
  const [tests, setTests] = useState(() => safeArr(getTests()));
  const testsSafe = useMemo(() => safeArr(tests), [tests]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedTestId, setSelectedTestId] = useState(() =>
    testsSafe[0]?.id ? String(testsSafe[0].id) : ""
  );

  useEffect(() => {
    const refreshFromBackend = async () => {
      setLoading(true);
      setError("");
      try {
        const items = await fetchStudentTests();
        if (Array.isArray(items)) {
          setTests(items);
          saveTests(items);
          if (items.length && !selectedTestId) {
            setSelectedTestId(String(items[0].id));
          }
        }
      } catch (e) {
        setError(e?.message || "Failed to load tests.");
      } finally {
        setLoading(false);
      }
    };

    refreshFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTest = useMemo(() => {
    const idNum = Number(selectedTestId);
    return testsSafe.find((t) => Number(t.id) === idNum) || null;
  }, [testsSafe, selectedTestId]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="h1">My Tests</div>
          <div className="muted">Choose a test then start.</div>
        </div>

        <div className="w-full sm:w-80">
          <Select
            label="Selected Test"
            value={selectedTestId}
            onChange={(e) => setSelectedTestId(e.target.value)}
          >
            {testsSafe.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-500">Loading tests...</div>
      )}
      {error && (
        <div className="text-sm text-rose-600">{error}</div>
      )}

      {!selectedTest ? (
        <Card title="No tests">
          <div className="muted">Ask the teacher to create a test first.</div>
        </Card>
      ) : (
        <Card title="Ready">
          <div className="muted mb-3">
            {selectedTest.name} • {selectedTest.q ?? 0} questions
          </div>

          <div className="mt-3 flex gap-2">
            <Button onClick={() => onStart?.(selectedTest.id)}>Start</Button>
            <Button variant="ghost" onClick={() => setSelectedTestId("")}>
              Clear
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
