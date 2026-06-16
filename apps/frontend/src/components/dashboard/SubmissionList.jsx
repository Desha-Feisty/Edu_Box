import React from 'react';

export default function SubmissionList({ submissions = [], onGrade }) {
  if (!submissions || submissions.length === 0) return <div className="p-4 text-sm text-slate-500">No submissions</div>;

  return (
    <div className="space-y-2">
      {submissions.map((s) => (
        <div key={s.id} className="flex items-center justify-between bg-white dark:bg-base-200 p-3 rounded-lg border border-slate-200/60 dark:border-white/[0.04]">
          <div>
            <div className="font-medium">{s.studentName}</div>
            <div className="text-xs text-slate-500">{s.submittedAt}</div>
          </div>
          <div>
            <button className="btn btn-sm btn-outline mr-2" onClick={() => onGrade(s)}>Grade</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// PropTypes omitted
