import React from "react";
import { Link } from "react-router-dom";
import AuthNavbar from "../components/AuthNavbar";
import { getSessionUser } from "../lib/storage";
import { Card, Button } from "../components/ui";

export default function Home() {
  const user = getSessionUser();

  return (
    <>
      <AuthNavbar />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Welcome">
          <div className="muted">
            منصة بسيطة لتجهيز اختبارات انجليزي للمعلمين والطلاب + توليد أسئلة بالذكاء الاصطناعي.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!user ? (
              <>
                <Link className="btnx-primary" to="/login">Login</Link>
                <Link className="btnx-ghost" to="/register">Register</Link>
              </>
            ) : (
              <>
                <Button onClick={() => (window.location.href = user.role === "teacher" ? "/teacher" : "/student")}>
                  Go to Dashboard
                </Button>
              </>
            )}
          </div>
          <div className="mt-3 muted">
            Demo: teacher@test.com / 1234 — student@test.com / 1234
          </div>
        </Card>

        <Card title="What you can do">
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Teacher: إنشاء اختبارات + إضافة أسئلة (يدوي/CSV/AI)</li>
            <li>Student: حل الاختبار + نتيجة وتصحيح</li>
            <li>AI: MCQ / True-False / Fill / Reorder / Reading</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
