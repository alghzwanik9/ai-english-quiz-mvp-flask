import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";

import AppShell from "./layout/AppShell";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";

import TeacherDashboard from "./pages/TeacherDashboard";
import CreateTest from "./pages/CreateTest";
import StrictQuiz from "./pages/StrictQuiz";
import TeacherResults from "./pages/TeacherResults";

import StudentDashboard from "./pages/StudentDashboard";
import TakeQuiz from "./pages/TakeQuiz";
import StudentResults from "./pages/StudentResults";

import { getUser } from "./services/authService";

function HomeRedirect() {
  const u = getUser();
  if (!u) return <Navigate to="/login" replace />;
  return <Navigate to={u.role === "teacher" ? "/teacher" : "/student"} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Teacher */}
      <Route
        path="/teacher"
        element={
          <RequireAuth role="teacher">
            <AppShell title="Teacher" role="teacher" />
          </RequireAuth>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="create" element={<CreateTest />} />
        <Route path="strict" element={<StrictQuiz />} />
        <Route path="results" element={<TeacherResults />} />
      </Route>

      {/* Student */}
      <Route
        path="/student"
        element={
          <RequireAuth role="student">
            <AppShell title="Student" role="student" />
          </RequireAuth>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="take/:testId" element={<TakeQuiz />} />
        <Route path="results" element={<StudentResults />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
