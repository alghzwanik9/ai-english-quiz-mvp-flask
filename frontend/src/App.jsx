import { useMemo, useState } from "react";
import AppShell from "./layout/AppShell";

import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import CreateTest from "./pages/CreateTest";
import StrictQuiz from "./pages/StrictQuiz";
import TakeQuiz from "./pages/TakeQuiz";
import StudentResults from "./pages/StudentResults";
import TeacherResults from "./pages/TeacherResults";

function Placeholder({ title }) {
  return (
    <div className="cardx">
      <div className="cardx-h">
        <div className="h1">{title}</div>
        <div className="muted">Coming soon…</div>
      </div>
      <div className="cardx-b">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6">
          Next steps: build this page UI + connect backend later.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState("student"); // "teacher" | "student"
  const [active, setActive] = useState(
    role === "teacher" ? "t_dashboard" : "s_dashboard"
  );

  const [currentTestId, setCurrentTestId] = useState(null);

  const switchRole = (nextRole) => {
    setRole(nextRole);
    setActive(nextRole === "teacher" ? "t_dashboard" : "s_dashboard");
    setCurrentTestId(null);
  };

  const navItems = useMemo(() => {
    if (role === "teacher") {
      return [
        { key: "t_dashboard", label: "Dashboard", icon: "dashboard" },
        { key: "t_create", label: "Create Test", icon: "create" },
        { key: "t_strict_builder", label: "Strict Builder", icon: "spark" },
        { key: "t_results", label: "Results", icon: "tests" },
        { key: "t_settings", label: "Settings", icon: "settings" },
      ];
    }
    return [
      { key: "s_dashboard", label: "My Tests", icon: "tests" },
      { key: "s_summaries", label: "Summaries", icon: "spark" },
      { key: "s_results", label: "Results", icon: "dashboard" },
      { key: "s_settings", label: "Settings", icon: "settings" },
    ];
  }, [role]);

  const titleMap = useMemo(
    () => ({
      t_dashboard: "Teacher Dashboard",
      t_create: "Create Test",
      t_strict_builder: "STRICT-QUIZ (Builder)",
      t_results: "Results",
      t_settings: "Settings",

      s_dashboard: "My Tests",
      s_take_quiz: "Take Quiz",
      s_summaries: "Summaries",
      s_results: "My Results",
      s_settings: "Settings",
    }),
    []
  );

  const title = titleMap[active] || (role === "teacher" ? "Teacher" : "Student");

  const renderPage = () => {
    // ===== Teacher =====
    if (active === "t_dashboard") return <TeacherDashboard go={setActive} />;
    if (active === "t_create") return <CreateTest />;
    if (active === "t_strict_builder")
      return <StrictQuiz onBack={() => setActive("t_dashboard")} />;
    if (active === "t_results")
      return <TeacherResults onBack={() => setActive("t_dashboard")} />;
    if (active === "t_settings") return <Placeholder title="Teacher Settings" />;

    // ===== Student =====
    if (active === "s_dashboard")
      return (
        <StudentDashboard
          onStart={(id) => {
            setCurrentTestId(id);
            setActive("s_take_quiz");
          }}
        />
      );

    if (active === "s_take_quiz")
      return (
        <TakeQuiz
          testId={currentTestId}
          onBack={() => setActive("s_dashboard")}
          onFinish={() => setActive("s_dashboard")}
        />
      );

    if (active === "s_summaries") return <Placeholder title="Summaries (Student)" />;
    if (active === "s_results")
      return <StudentResults onBack={() => setActive("s_dashboard")} />;
    if (active === "s_settings") return <Placeholder title="Student Settings" />;

    // fallback
    return role === "teacher" ? (
      <TeacherDashboard go={setActive} />
    ) : (
      <StudentDashboard
        onStart={(id) => {
          setCurrentTestId(id);
          setActive("s_take_quiz");
        }}
      />
    );
  };

  return (
    <AppShell
      title={title}
      role={role}
      active={active}
      onNavigate={setActive}
      navItems={navItems}
      onSwitchRole={switchRole}
    >
      {renderPage()}
    </AppShell>
  );
}
