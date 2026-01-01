import React, { useMemo } from "react";

export default function StatsRow({ tests = [] }) {
  const stats = useMemo(() => {
    const totalTests = tests.length;
    const totalQuestions = tests.reduce((sum, t) => sum + (t.questions?.length || 0), 0);
    return { totalTests, totalQuestions };
  }, [tests]);

  return (
    <div className="row g-3 my-2">
      <div className="col-md-6">
        <div className="card p-3">
          <div className="small-muted">Total Tests</div>
          <div className="fs-4 fw-bold">{stats.totalTests}</div>
        </div>
      </div>
      <div className="col-md-6">
        <div className="card p-3">
          <div className="small-muted">Total Questions</div>
          <div className="fs-4 fw-bold">{stats.totalQuestions}</div>
        </div>
      </div>
    </div>
  );
}
