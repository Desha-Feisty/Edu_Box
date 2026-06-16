import React from 'react';
// PropTypes omitted to avoid runtime dependency
import telemetry from '../../lib/telemetry';
import EVENTS from '../../../../../packages/shared/src/telemetry';

export default function NextActionList({ actions = [], onStart }) {
  const handleStart = (action) => {
    telemetry.track(EVENTS.STUDENT_ACTION_START, { actionId: action.id, actionType: action.type, courseId: action.courseId });
    if (onStart) onStart(action);
  };

  if (!actions || actions.length === 0) {
    return <div className="bg-white dark:bg-base-200 rounded-2xl p-6">No upcoming actions</div>;
  }

  return (
    <div className="space-y-3">
      {actions.map((a) => (
        <div key={a.id} className="bg-white dark:bg-base-200 rounded-xl p-4 flex items-center justify-between border border-slate-200/60 dark:border-white/[0.04]">
          <div>
            <div className="text-sm font-medium">{a.title}</div>
            <div className="text-xs text-slate-500">Due {a.due}</div>
          </div>
          <div>
            <button className="btn btn-brand" onClick={() => handleStart(a)}>{a.primaryLabel || 'Start'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// PropTypes omitted
