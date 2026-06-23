import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, User, MessageSquare, AlertCircle,
  Loader2, Save, ThumbsUp, RefreshCw, GraduationCap,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import telemetry from '../lib/telemetry';
import EVENTS from '@edubox/shared/telemetry';

const TABS = [
  { id: 'ungraded', label: 'Needs Grading', icon: GraduationCap },
  { id: 'contested', label: 'Review Requests', icon: ClipboardList },
];

export default function TeacherReviewRequestsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ungraded');
  const [ungradedAttempts, setUngradedAttempts] = useState([]);
  const [contestedAttempts, setContestedAttempts] = useState([]);
  const [loadingUngraded, setLoadingUngraded] = useState(true);
  const [loadingContested, setLoadingContested] = useState(true);
  const [scores, setScores] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────
  const fetchUngraded = useCallback(async () => {
    setLoadingUngraded(true);
    try {
      const res = await api.get('/attempts/ungraded/teacher');
      setUngradedAttempts(res.data.attempts || []);
    } catch {
      // silent
    } finally {
      setLoadingUngraded(false);
    }
  }, []);

  const fetchContested = useCallback(async () => {
    setLoadingContested(true);
    try {
      const res = await api.get('/attempts/contested/teacher');
      setContestedAttempts(res.data.attempts || []);
    } catch {
      // silent
    } finally {
      setLoadingContested(false);
    }
  }, []);

  useEffect(() => {
    fetchUngraded();
    fetchContested();
  }, [fetchUngraded, fetchContested]);

  // ── Derived counts ─────────────────────────────────────────────────
  const ungradedCount = ungradedAttempts.reduce((s, a) => s + (a.responses?.length || 0), 0);
  const contestedCount = contestedAttempts.reduce((s, a) => s + (a.responses?.length || 0), 0);

  const currentData = activeTab === 'ungraded' ? ungradedAttempts : contestedAttempts;
  const isLoading = activeTab === 'ungraded' ? loadingUngraded : loadingContested;

  // ── Response key helpers ───────────────────────────────────────────
  const getRespKey = (attemptId, resp, idx) => `${attemptId}-${resp.index ?? idx}`;
  const getScore = (key, resp) => scores[key] ?? resp.pointsAwarded ?? 0;
  const getFeedback = (key, resp) => feedbacks[key] ?? resp.aiFeedback ?? '';

  // ── Actions ────────────────────────────────────────────────────────
  const refreshTab = useCallback(() => {
    if (activeTab === 'ungraded') fetchUngraded();
    else fetchContested();
  }, [activeTab, fetchUngraded, fetchContested]);

  const handleGradeUngraded = async (attemptId, responseIdx, score, feedback) => {
    const key = `${attemptId}-${responseIdx}`;
    setSavingKey(key);
    try {
      await api.patch(`/attempts/${attemptId}/responses/${responseIdx}/score`, { score, feedback });
      toast.success('Grade saved');
      await fetchUngraded();
      telemetry.track(EVENTS.TEACHER_GRADE_SUBMIT, { attemptId, responseIndex: responseIdx, score });
    } catch {
      toast.error('Failed to save grade');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveScore = async (attemptId, responseIdx, score, feedback) => {
    const key = `${attemptId}-${responseIdx}`;
    setSavingKey(key);
    try {
      await api.patch(`/attempts/${attemptId}/responses/${responseIdx}/score`, { score, feedback });
      toast.success('Score saved');
      telemetry.track(EVENTS.TEACHER_GRADE_SUBMIT, { attemptId, responseIndex: responseIdx, score });
    } catch {
      toast.error('Failed to save score');
    } finally {
      setSavingKey(null);
    }
  };

  const handleResolve = async (attemptId, responseIdx, score, feedback) => {
    const key = `${attemptId}-${responseIdx}`;
    setSavingKey(key);
    try {
      await api.patch(`/attempts/${attemptId}/responses/${responseIdx}/contest/resolve`, { score, feedback });
      toast.success('Contest resolved');
      await fetchContested();
      telemetry.track(EVENTS.TEACHER_GRADE_SUBMIT, { attemptId, responseIndex: responseIdx, score, resolved: true });
    } catch {
      toast.error('Failed to resolve contest');
    } finally {
      setSavingKey(null);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────
  const renderResponseCard = (attempt, resp, idx) => {
    const key = getRespKey(attempt._id, resp, idx);
    const isSaving = savingKey === key;
    const isContestTab = activeTab === 'contested';
    const isPending = resp.contestStatus === 'pending';
    const isUngraded = activeTab === 'ungraded';

    return (
      <div
        key={resp.index ?? idx}
        className={`p-5 ${isContestTab && isPending ? 'bg-amber-50/20 dark:bg-amber-900/5' : ''} ${isContestTab && !isPending ? 'bg-emerald-50/20 dark:bg-emerald-900/5' : ''}`}
      >
        {/* Question + status badge */}
        <div className="flex items-start gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-slate-900 dark:text-white break-words">
              {resp.prompt}
            </span>
            <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">{resp.points} pts</span>
          </div>
          {isContestTab && isPending && (
            <span className="badge badge-warning badge-sm shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />
              Pending
            </span>
          )}
          {isContestTab && !isPending && (
            <span className="badge badge-success badge-sm shrink-0">Resolved</span>
          )}
          {isUngraded && (
            <span className="badge badge-info badge-sm shrink-0">Ungraded</span>
          )}
        </div>

        {/* Student answer */}
        <div className="ml-6 mb-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Student answer:</div>
          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            {resp.textAnswer
              || (Array.isArray(resp.selectedText) ? resp.selectedText.join(', ') : resp.selectedText ?? '')
              || <span className="italic text-slate-400">No answer provided</span>}
          </div>
        </div>

        {/* Contest reason (contested tab only) */}
        {isContestTab && resp.contestReason && (
          <div className="ml-6 mb-3 p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Student&apos;s contest reason:
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{resp.contestReason}</p>
          </div>
        )}

        {/* Score display */}
        <div className="ml-6 mb-3 text-xs text-slate-500 dark:text-slate-400">
          {isUngraded ? (
            <>AI: <span className="font-medium text-slate-700 dark:text-slate-300">{resp.aiScore ?? '—'}</span></>
          ) : (
            <>AI score: <span className="font-medium text-slate-700 dark:text-slate-300">{resp.aiScore ?? '—'}</span></>
          )}
          {' · '}
          Current: <span className="font-medium text-slate-700 dark:text-slate-300">{resp.pointsAwarded ?? 0}</span>
          {' / '}
          {resp.points}
        </div>

        {/* Grading controls */}
        {(isUngraded || isContestTab) && (
          <div className="ml-6 flex flex-wrap items-end gap-2">
            <div className="form-control w-20">
              <label className="label pb-1">
                <span className="label-text text-xs">Score</span>
              </label>
              <input
                type="number"
                min={0}
                max={resp.points || 100}
                value={getScore(key, resp)}
                onChange={(e) => setScores((s) => ({ ...s, [key]: Number(e.target.value) }))}
                className="input input-sm input-bordered"
                disabled={isSaving}
              />
            </div>
            <div className="form-control flex-1 min-w-[200px]">
              <label className="label pb-1">
                <span className="label-text text-xs">Message to student (optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Explain your grading decision..."
                value={getFeedback(key, resp)}
                onChange={(e) => setFeedbacks((f) => ({ ...f, [key]: e.target.value }))}
                className="textarea textarea-sm textarea-bordered resize-none"
                disabled={isSaving}
              />
              <label className="label py-0 pt-1">
                <span className="label-text-alt text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {isContestTab ? 'Sent to student on resolve' : 'Sent to student with grade'}
                </span>
              </label>
            </div>
            <div className="flex gap-2">
              {isContestTab ? (
                <>
                  {isPending ? (
                    <>
                      <button
                        className="btn btn-sm btn-warning gap-1.5"
                        disabled={isSaving}
                        onClick={() => handleResolve(
                          attempt._id, resp.index ?? idx,
                          getScore(key, resp), getFeedback(key, resp),
                        )}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                        Resolve &amp; Send
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={isSaving}
                        onClick={() => handleSaveScore(
                          attempt._id, resp.index ?? idx,
                          getScore(key, resp), getFeedback(key, resp),
                        )}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-sm btn-warning gap-1.5"
                        disabled={isSaving}
                        onClick={() => handleResolve(
                          attempt._id, resp.index ?? idx,
                          getScore(key, resp), getFeedback(key, resp),
                        )}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Re-resolve &amp; Send
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={isSaving}
                        onClick={() => handleSaveScore(
                          attempt._id, resp.index ?? idx,
                          getScore(key, resp), getFeedback(key, resp),
                        )}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button
                  className="btn btn-sm btn-primary gap-1.5"
                  disabled={isSaving}
                  onClick={() => handleGradeUngraded(
                    attempt._id, resp.index ?? idx,
                    getScore(key, resp), getFeedback(key, resp),
                  )}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Grade
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAttemptCard = (attempt) => {
    const isContestTab = activeTab === 'contested';
    const pendingCount = isContestTab ? attempt.responses.filter(r => r.contestStatus === 'pending').length : 0;
    const resolvedCount = isContestTab ? attempt.responses.filter(r => r.contestStatus === 'resolved').length : 0;
    return (
      <div
        key={attempt._id}
        className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden shadow-sm"
      >
        {/* Attempt header */}
        <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/10 dark:to-transparent border-b border-amber-200/60 dark:border-amber-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {attempt.student?.name || 'Unknown Student'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {attempt.quiz?.title || 'Unknown Quiz'}
                </p>
              </div>
            </div>
            <div className="text-right">
              {isContestTab ? (
                <div className="flex gap-1.5">
                  {pendingCount > 0 && (
                    <span className="badge badge-warning badge-sm">{pendingCount} pending</span>
                  )}
                  {resolvedCount > 0 && (
                    <span className="badge badge-success badge-sm">{resolvedCount} resolved</span>
                  )}
                </div>
              ) : (
                <span className="badge badge-info badge-sm">{attempt.responses.length} ungraded</span>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Responses */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
          {attempt.responses.map((resp, idx) => renderResponseCard(attempt, resp, idx))}
        </div>
      </div>
    );
  };

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loadingUngraded && loadingContested) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const hasData = currentData.length > 0;

  // ── Main content ─────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher')} className="btn btn-ghost btn-sm rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Review Requests</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {ungradedCount} ungraded · {contestedCount} contested
            </p>
          </div>
        </div>
        <button onClick={refreshTab} className="btn btn-ghost btn-sm rounded-xl" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="tabs tabs-bordered">
        {TABS.map((tab) => {
          const count = tab.id === 'ungraded' ? ungradedCount : contestedCount;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`tab tab-lg gap-2 ${isActive ? 'tab-active font-semibold' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span className={`badge badge-sm ${isActive ? 'badge-primary' : 'badge-ghost'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {hasData ? (
        <div className="space-y-4">
          {currentData.map((attempt) => renderAttemptCard(attempt))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {activeTab === 'ungraded' ? (
            <>
              <GraduationCap className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">All graded!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">No written submissions need manual grading</p>
            </>
          ) : (
            <>
              <ClipboardList className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">All caught up!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">No pending grade review requests</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
