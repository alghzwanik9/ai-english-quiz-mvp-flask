import { Navigate, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import AppShell from "./layout/AppShell";
import RequireAuth from "./components/RequireAuth";

import TeacherDashboard from "./pages/TeacherDashboard";
import CreateTest from "./pages/CreateTest";
import TeacherResults from "./pages/TeacherResults";
import StrictQuiz from "./pages/StrictQuiz";

import StudentDashboard from "./pages/StudentDashboard";
import TakeQuiz from "./pages/TakeQuiz";
import StudentResults from "./pages/StudentResults";
import StudentSummarize from "./pages/StudentSummarize";
import StudentLearn from "./pages/StudentLearn";
import JoinTeacher from "./pages/JoinTeacher";

const teacherNavItems = [
  { label: "لوحة التحكم", to: "/teacher", end: true },
  { label: "إنشاء اختبار", to: "/teacher/create" },
  { label: "النتائج", to: "/teacher/results" },
  { label: "مشاركة", to: "/teacher/strict" },
];

const studentNavItems = [
  { label: "لوحة الطالب", to: "/student", end: true },
  { label: "النتائج", to: "/student/results" },
  { label: "تلخيص", to: "/student/summarize" },
  { label: "تعلّم", to: "/student/learn" },
];

export default function App() {
  return (
    <Routes>
      {/* ===================== Public ===================== */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/join/:token" element={<JoinTeacher />} />

      {/* ===================== Teacher ===================== */}
      <Route
        path="/teacher/*"
        element={
          <RequireAuth role="teacher">
            <AppShell
              title="Teacher"
              role="teacher"
              navItems={teacherNavItems}
            />
          </RequireAuth>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="create" element={<CreateTest />} />
        <Route path="results" element={<TeacherResults />} />
        <Route path="strict" element={<StrictQuiz />} />
      </Route>

      {/* ===================== Student ===================== */}
      <Route
        path="/student/*"
        element={
          <RequireAuth role="student">
            <AppShell
              title="Student"
              role="student"
              navItems={studentNavItems}
            />
          </RequireAuth>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="take" element={<TakeQuiz />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="summarize" element={<StudentSummarize />} />
        <Route path="learn" element={<StudentLearn />} />
      </Route>

      {/* ===================== 404 ===================== */}
      <Route
        path="*"
        element={
          <div style={{ padding: 40, textAlign: "center" }}>
            <h2>404</h2>
            <p>Page not found</p>
          </div>
        }
      />
    </Routes>
  );
}
