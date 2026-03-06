import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { joinTeacher } from "../services/studentService";

export default function JoinTeacher() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function join() {
      try {
        await joinTeacher(token);
        navigate("/student", { replace: true });
      } catch (e) {
        setError(
          e?.response?.data?.error ||
          "فشل الانضمام. تأكد من الرابط أو تسجيل الدخول."
        );
      } finally {
        setLoading(false);
      }
    }

    join();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        جاري الانضمام للمعلم...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return null;
}
