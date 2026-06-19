import React from 'react';
import { ClipboardList, User, MessageSquare } from 'lucide-react';

export default function ContestedList({ attempts, onGrade }) {
  if (!attempts || attempts.length === 0) return null;

  return (
    <div className="space-y-3">
      {attempts.map((a) => (
        <div key={a._id} className="bg-white dark:bg-base-200 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {a.student?.name || 'Unknown Student'}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {a.quiz?.title || 'Unknown Quiz'}
              </span>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {a.responses?.map((r, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 p-2 bg-white/50 dark:bg-base-300/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {r.prompt}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    "{r.contestReason}"
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Current score: {r.pointsAwarded ?? '?'}/{r.points} • AI score: {r.aiScore ?? '?'}
                  </div>
                </div>
                <button
                  className="btn btn-xs btn-warning shrink-0"
                  onClick={() => onGrade(a._id)}
                >
                  <ClipboardList className="w-3 h-3" />
                  Grade
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
