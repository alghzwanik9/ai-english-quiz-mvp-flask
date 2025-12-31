import { useMemo, useState } from "react";
import AppShell from "./layout/AppShell";

import TeacherDashboard from "./pages/TeacherDashboard";
import CreateTest from "./pages/CreateTest";

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
  const [role] = useState("teacher"); // حالياً خلّها teacher
  const [active, setActive] = useState("dashboard");

  const titleMap = useMemo(
    () => ({
      dashboard: "Dashboard",
      create: "Create Test",
      bank: "Question Bank",
      imports: "Imports Review",
      settings: "Settings",
    }),
    []
  );

  const title = titleMap[active] || "Dashboard";

  const renderPage = () => {
    if (active === "dashboard") return <TeacherDashboard />;
    if (active === "create") return <CreateTest />;
    if (active === "bank") return <Placeholder title="Question Bank" />;
    if (active === "imports") return <Placeholder title="Imports Review" />;
    if (active === "settings") return <Placeholder title="Settings" />;
    return <TeacherDashboard />;
  };

  return (
    <AppShell
      title={title}
      role={role}
      active={active}
      onNavigate={setActive}
    >
      {renderPage()}
    </AppShell>
  );
}
