import React from 'react';

export default function StatCard({ title, value, delta, sparkline, primaryAction }) {
  return (
    <div className="bg-white dark:bg-base-200 rounded-2xl p-4 shadow-sm border border-slate-200/60 dark:border-white/[0.04]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
        </div>
        <div className="text-right">
          {delta != null && (
            <div className={`text-sm font-medium ${delta > 0 ? 'text-green-600' : 'text-rose-600'}`}>{delta > 0 ? `+${delta}` : delta}</div>
          )}
        </div>
      </div>

      {sparkline && <div className="mt-3 h-8">{/* sparkline placeholder */}</div>}

      {primaryAction && (
        <div className="mt-4">
          <button className="btn btn-brand btn-sm" onClick={primaryAction.onClick}>{primaryAction.label}</button>
        </div>
      )}
    </div>
  );
}

// PropTypes removed to avoid runtime dependency; rely on TypeScript/IDE for types where possible.
