// ===============================================
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Button } from "../ui";
import { fetchTeacherTests } from "../services/teacherService";

function shareUrlForToken(token) {
  if (!token) return "";
  return `${window.location.origin}/quiz/${token}`;
}

function useQueryParam(name) {
  const { search } = useLocation();
  return new URLSearchParams(search).get(name);
}

export default function StrictQuiz() {
  const nav = useNavigate();
  const testId = useQueryParam("testId");

  const [tests, setTests] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    setErr("");
    try {
      const t = await fetchTeacherTests();
      setTests(t);
    } catch (e) {
      setErr(e?.message || "Failed to load tests");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert("تم النسخ ✅");
    } catch {
      alert("ما قدرت أنسخ. انسخ يدويًا.");
    }
  }

  const selected = testId ? tests.find((t) => String(t.id) === String(testId)) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xl font-semibold">مشاركة الاختبارات</div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav("/teacher")}>رجوع</Button>
          <Button variant="ghost" onClick={load}>تحديث</Button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

      <Card title="روابط المشاركة (public_token)">
        {busy ? (
          <div className="muted">جاري التحميل…</div>
        ) : tests.length === 0 ? (
          <div className="muted">ما عندك اختبارات.</div>
        ) : (
          <div className="space-y-2">
            {(selected ? [selected] : tests).map((t) => {
              const url = shareUrlForToken(t.public_token);
              return (
                <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.subject} • {t.difficulty}</div>

                  {t.public_token ? (
                    <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="text-xs break-all">
                        <span className="font-mono">{url}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => copy(url)}>نسخ</Button>
                        <Button variant="ghost" onClick={() => nav(`/teacher/results?testId=${t.id}`)}>نتائج</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">
                      لا يوجد public_token لهذا الاختبار (تحقق من DB/migrations).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}