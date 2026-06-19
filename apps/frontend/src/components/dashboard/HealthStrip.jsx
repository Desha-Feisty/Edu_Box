import React from 'react';

function Chip({ label, status, lastSeen }) {
  const color = status === 'ok' ? 'bg-green-100 text-green-800' : status === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-md ${color} mr-2`}>
      <div className="text-xs font-medium">{label}</div>
      {lastSeen && <div className="ml-2 text-2xs text-slate-600 dark:text-slate-400">{lastSeen}</div>}
    </div>
  );
}

export default function HealthStrip({ items = [], onRefresh }) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center">
        {items.map((it) => (
          <Chip key={it._id || it.id} label={it.label} status={it.status} lastSeen={it.lastSeen} />
        ))}
      </div>
      <div className="flex items-center">
        <button className="btn btn-ghost btn-sm mr-2" onClick={onRefresh}>Refresh</button>
      </div>
    </div>
  );
}

// PropTypes removed (dev-dependency minimizing)
