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
  const [scores, setScores] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!attemptId) return;
    const fetchGradeData = async () => {
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
    fetchGradeData();
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
      try {
        if (onUpdated) onUpdated({ attemptId, index, score: res.data.score });
      } catch (cbErr) {
        console.error('onUpdated callback failed', cbErr);
      }
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
              {responses.map((r, idx) => {
                const isContested = r.contestStatus === "pending";
                const wasResolved = r.contestStatus === "resolved";
                return (
                <div key={idx} className={`p-3 rounded-lg ${isContested ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700' : wasResolved ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-700/30'}`}>
                  <div className="flex items-center gap-2">
                    <div className="font-medium flex-1">Q: {r.prompt}</div>
                    {isContested && <span className="badge badge-warning badge-sm gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Contested</span>}
                    {wasResolved && <span className="badge badge-success badge-sm">Resolved</span>}
                  </div>
                  <div className="text-xs text-slate-500">Type: {r.questionType} • Points: {r.points}</div>
                  <div className="mt-2">
                    <div className="text-sm">Student answer:</div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded mt-1 text-sm">{r.textAnswer || (Array.isArray(r.selectedText) ? r.selectedText.join(', ') : r.selectedText ?? '') || '—'}</div>
                  </div>
                  {isContested && r.contestReason && (
                    <div className="mt-2 bg-white/60 dark:bg-base-300/60 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Student's contest reason:</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{r.contestReason}</div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <input type="number" min={0} max={r.points || 100} value={scores[idx] ?? r.pointsAwarded ?? 0} onChange={(e) => setScores((s) => ({ ...s, [idx]: Number(e.target.value) }))} className="input input-sm w-24" />
                    <input type="text" placeholder="Feedback (optional)" value={feedbacks[idx] ?? r.aiFeedback ?? ''} onChange={(e) => setFeedbacks((f) => ({ ...f, [idx]: e.target.value }))} className="input input-sm flex-1" />
                    <button className="btn btn-sm btn-primary" onClick={async () => {
                      try {
                        await handleUpdateScore(idx, scores[idx] ?? r.pointsAwarded ?? 0, feedbacks[idx] ?? r.aiFeedback ?? '');
                        toast.success('Score updated');
                      } catch (_err) {
                        toast.error('Failed to update score');
                      }
                    }}>Save</button>
                    {isContested && (
                      <button className="btn btn-sm btn-warning" onClick={async () => {
                        try {
                          await axios.patch(
                            `/api/attempts/${attemptId}/responses/${idx}/contest/resolve`,
                            { score: scores[idx] ?? r.pointsAwarded ?? 0, feedback: feedbacks[idx] ?? r.aiFeedback ?? '' },
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          toast.success('Contest resolved');
                          // Re-fetch to update contest status
                          const res = await axios.get(`/api/attempts/${attemptId}`, { headers: { Authorization: `Bearer ${token}` } });
                          setResponses(res.data.responses || []);
                        } catch (_err) {
                          toast.error('Failed to resolve contest');
                        }
                      }}>Resolve</button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
