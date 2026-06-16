import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../../stores/Authstore';
import telemetry from '../../lib/telemetry';
import EVENTS from '@edubox/shared/telemetry';
import { toast } from 'react-hot-toast';

export default function GradeModal({ attemptId, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [responses, setResponses] = useState([]);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!attemptId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/attempts/${attemptId}`, { headers: { Authorization: `Bearer ${token}` } });
        setAttempt(res.data.attempt);
        setResponses(res.data.responses || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load attempt details', error);
    } finally {
      setLoading(false);
    }
    };
    fetch();
  }, [attemptId, token]);

  const handleUpdateScore = async (index, score, feedback) => {
    try {
      const res = await axios.patch(`/api/attempts/${attemptId}/responses/${index}/score`, { score, feedback }, { headers: { Authorization: `Bearer ${token}` } });
      // Update local response and attempt totals
      const updated = [...responses];
      if (updated[index]) {
        updated[index].pointsAwarded = res.data.score;
        updated[index].aiFeedback = res.data.feedback;
      }
      setResponses(updated);
      if (onUpdated) onUpdated({ attemptId, index, score: res.data.score });
      telemetry.track(EVENTS.TEACHER_GRADE_SUBMIT, { attemptId, responseIndex: index, score });
    } catch (_err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update score', _err);
      throw _err;
    }
  };

  if (!attemptId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl bg-white dark:bg-base-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Grade Submission</h3>
          <div>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">Attempt ID: {attempt?._id}</div>
            <div className="grid grid-cols-1 gap-3">
              {responses.map((r, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                  <div className="font-medium">Q: {r.prompt}</div>
                  <div className="text-xs text-slate-500">Type: {r.questionType} • Points: {r.points}</div>
                  <div className="mt-2">
                    <div className="text-sm">Student answer:</div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded mt-1 text-sm">{r.textAnswer || (r.selectedText && r.selectedText.join(', ')) || '—'}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <input type="number" min={0} max={r.points || 100} defaultValue={r.pointsAwarded || 0} className="input input-sm w-24" id={`score-${idx}`} />
                    <input type="text" placeholder="Feedback (optional)" defaultValue={r.aiFeedback || ''} className="input input-sm flex-1" id={`feedback-${idx}`} />
                    <button className="btn btn-sm btn-primary" onClick={async () => {
                      const score = Number(document.getElementById(`score-${idx}`).value || 0);
                      const feedback = document.getElementById(`feedback-${idx}`).value || '';
                      try {
                        await handleUpdateScore(idx, score, feedback);
                        toast.success('Score updated');
                      } catch (_err) {
                        toast.error('Failed to update score');
                      }
                    }}>Save</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
