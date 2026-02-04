import React, { useEffect, useMemo, useState } from "react";
import { Card, Button, Select } from "../ui";
import { getTests } from "../lib/storage";

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

export default function StudentDashboard({ onStart }) {
  const [tests, setTests] = useState(() => safeArr(getTests()));
  const testsSafe = useMemo(() => safeArr(tests), [tests]);

  const [selectedTestId, setSelectedTestId] = useState(() =>
    testsSafe[0]?.id ? String(testsSafe[0].id) : ""
  );

  useEffect(() => {
    const refresh = () => {
      const next = safeArr(getTests());
      setTests(next);

      if (!next.length) {
        setSelectedTestId("");
        return;
      }

      const exists = next.some((t) => String(t.id) === String(selectedTestId));
      if (!exists) setSelectedTestId(String(next[0].id));
    };

    refresh();

    const onCustom = (e) => {
      const key = e?.detail?.key;
      if (!key || key === "tests") refresh();
    };
    window.addEventListener("storage_updated", onCustom);

    const onNative = (e) => {
      if (!e?.key || e.key === "tests") refresh();
    };
    window.addEventListener("storage", onNative);

    return () => {
      window.removeEventListener("storage_updated", onCustom);
      window.removeEventListener("storage", onNative);
    };
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

      {!selectedTest ? (
        <Card title="No tests">
          <div className="muted">Ask the teacher to create a test first.</div>
        </Card>
      ) : (
        <Card title="Ready">
          <div className="muted mb-3">
            {selectedTest.name} • {safeArr(selectedTest.questions).length} questions
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
