import React from 'react';

export default function CourseList({ courses = [], onSelect }) {
  if (!courses || courses.length === 0) return <div className="p-4 text-sm text-slate-500">No courses</div>;

  return (
    <div className="space-y-2">
      {courses.map((c) => (
        <button key={c._id} onClick={() => onSelect && onSelect(c)} className="w-full text-left bg-white dark:bg-base-200 p-3 rounded-lg border border-slate-200/60 dark:border-white/[0.04] hover:shadow">
          <div className="flex items-center justify-between">
            <div className="font-medium">{c.title}</div>
            <div className="text-xs text-slate-500">{c.pendingSubmissions || 0}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// PropTypes omitted
