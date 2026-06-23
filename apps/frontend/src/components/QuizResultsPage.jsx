import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useQuizStore from "../stores/Quizstore";
import useAuthStore from "../stores/Authstore";
import axios from "axios";
import toast from "react-hot-toast";
import {
    Home,
    CheckCircle,
    XCircle,
    Clock,
    Calendar,
    Trophy,
    TrendingUp,
    ArrowLeft,
} from "lucide-react";
import PageWrapper from "./layout/PageWrapper";

function QuizResultsPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const { currentAttempt } = useQuizStore();
    const { token } = useAuthStore();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [animatedScore, setAnimatedScore] = useState(0);
    const [contestForm, setContestForm] = useState(null); // { responseIndex, reason }
    const [contestSubmitting, setContestSubmitting] = useState(false);
    const scoreRef = useRef(null);
    const [gradingInProgress, setGradingInProgress] = useState(false);
    const pollingRef = useRef(null);

    useEffect(() => {
        const fetchAttempt = async () => {
            try {
                const response = await axios.get(`/api/attempts/${attemptId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const attemptData = {
                    ...response.data.attempt,
                    quiz: response.data.quiz,
                    course: response.data.course,
                    responses: response.data.responses,
                };
                setAttempt(attemptData);
            } catch (err) {
                console.error("Failed to fetch attempt:", err);
                if (currentAttempt?._id === attemptId) {
                    setAttempt(currentAttempt);
                } else if (err.response?.status === 404) {
                    // Quiz might have been already submitted and graded
                    setError("This quiz has already been submitted. Your results are available.");
                } else {
                    setError(
                        err.response?.data?.errMsg || "Failed to load results",
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAttempt();
    }, [attemptId, currentAttempt, token]);

    // Polling effect — re-fetches attempt while written questions await AI grading
    useEffect(() => {
        if (!attempt || attempt.status !== "submitted") return;

        const hasWrittenAwaitingGrade = attempt.responses?.some(
            (r) => r.questionType === "written" && r.aiScore === undefined
        );
        if (!hasWrittenAwaitingGrade) return;

        setGradingInProgress(true);

        pollingRef.current = setInterval(async () => {
            try {
                const response = await axios.get(`/api/attempts/${attemptId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const allAiGraded = !response.data.attempt.responses?.some(
                    (r) => r.questionType === "written" && r.aiScore === undefined
                );
                if (response.data.attempt.status === "graded" || allAiGraded) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                    setGradingInProgress(false);
                    setAttempt({
                        ...response.data.attempt,
                        quiz: response.data.quiz,
                        course: response.data.course,
                        responses: response.data.responses,
                    });
                }
            } catch {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
                setGradingInProgress(false);
                toast.error("Failed to check grading status. Updates may be delayed.");
            }
        }, 2000);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            setGradingInProgress(false);
        };
    }, [attempt, attemptId, token]);

    const handleContestSubmit = async (responseIndex) => {
        const reason = contestForm?.reason?.trim();
        if (!reason) return;
        setContestSubmitting(true);
        try {
            await axios.post(
                `/api/attempts/${attemptId}/responses/${responseIndex}/contest`,
                { reason },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setContestForm(null);
            // Refresh attempt to show contest status
            const resp = await axios.get(`/api/attempts/${attemptId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAttempt({
                ...resp.data.attempt,
                quiz: resp.data.quiz,
                course: resp.data.course,
                responses: resp.data.responses,
            });
        } catch (err) {
            alert(err.response?.data?.error || "Failed to submit contest");
        } finally {
            setContestSubmitting(false);
        }
    };

    // Calculate stats (safe for null attempt during initial loading)
    const rawScore = attempt
        ? (Number.isFinite(attempt.score)
            ? attempt.score
            : attempt.responses?.reduce(
                  (sum, r) =>
                      sum +
                      (Number.isFinite(r.pointsAwarded) ? r.pointsAwarded : 0),
                  0,
              ) || 0)
        : 0;
    const totalPointsPossible = attempt?.responses?.reduce(
        (sum, r) => sum + (r.points || 1),
        0,
    ) || 0;
    const scorePercentage =
        totalPointsPossible > 0
            ? Math.round((rawScore / totalPointsPossible) * 100)
            : 0;

    const correctAnswers =
        attempt?.responses?.filter((r) => r.pointsAwarded > 0).length || 0;
    const pendingWritten = attempt?.responses?.filter(
        (r) => r.questionType === "written" && r.aiScore === undefined
    ).length || 0;
    const incorrectAnswers = (attempt?.responses?.length || 0) - correctAnswers - pendingWritten;

    // Determine performance level
    const getPerformanceData = (percentage) => {
        if (percentage >= 90) {
            return {
                label: "Outstanding",
                icon: Trophy,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
                borderColor: "border-emerald-200",
                message: "🎉 Excellent work! Outstanding performance!",
            };
        } else if (percentage >= 80) {
            return {
                label: "Excellent",
                icon: Trophy,
                color: "text-green-600",
                bgColor: "bg-green-50",
                borderColor: "border-green-200",
                message: "🎉 Great job! You passed with flying colors!",
            };
        } else if (percentage >= 70) {
            return {
                label: "Good",
                icon: CheckCircle,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
                borderColor: "border-blue-200",
                message: "👍 Good work! You passed the quiz.",
            };
        } else if (percentage >= 60) {
            return {
                label: "Satisfactory",
                icon: CheckCircle,
                color: "text-yellow-600",
                bgColor: "bg-yellow-50",
                borderColor: "border-yellow-200",
                message: "📊 You passed, but there's room for improvement.",
            };
        } else {
            return {
                label: "Needs Improvement",
                icon: XCircle,
                color: "text-red-600",
                bgColor: "bg-red-50",
                borderColor: "border-red-200",
                message: "📚 Keep practicing! You can improve.",
            };
        }
    };

    const performanceData = getPerformanceData(scorePercentage);
    const PerformanceIcon = performanceData.icon;

    const timeTaken = (() => {
        if (!attempt?.submittedAt || (!attempt?.startedAt && !attempt?.startAt)) {
            return null;
        }

        const submittedTime = new Date(attempt.submittedAt).getTime();
        const startedTime = new Date(
            attempt.startedAt || attempt.startAt,
        ).getTime();
        const diffMinutes = Math.max(
            0,
            Math.round((submittedTime - startedTime) / 60000),
        );

        return diffMinutes;
    })();

    // Animated score counter
    useEffect(() => {
        if (!attempt || loading) return;

        const target = scorePercentage;
        const duration = 1200;
        const startTime = window.performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedScore(Math.round(eased * target));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [attempt, loading, scorePercentage]);

    if (loading) {
        return (
            <PageWrapper>
                <div className="min-h-[80vh] flex items-center justify-center">
                    <span className="loading loading-spinner loading-lg text-brand-600"></span>
                </div>
            </PageWrapper>
        );
    }

    if (error) {
        return (
            <PageWrapper>
                <div className="min-h-[80vh] flex items-center justify-center px-6 relative z-10">
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] w-full p-8 text-center text-red-600 dark:text-red-400">
                        <p className="text-xl font-bold mb-6">{error}</p>
                        <button
                            onClick={() => navigate("/student")}
                            className="btn-brand"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    if (!attempt) {
        return (
            <PageWrapper>
                <div className="min-h-[80vh] flex items-center justify-center px-6 relative z-10">
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] w-full p-8 text-center">
                        <p className="text-slate-600 dark:text-slate-400 text-lg font-bold mb-6">
                            Results not found
                        </p>
                        <button
                            onClick={() => navigate("/student")}
                            className="btn-brand"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <main className="min-h-screen py-12 px-6 animate-in fade-in duration-500 relative z-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Main Results Card */}
                    <div
                        className={`bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden relative ${performanceData.borderColor}`}
                    >
                        <div className={`absolute top-0 left-0 w-full h-2 ${performanceData.bgColor} dark:bg-opacity-20`}></div>
                        <div className="p-12 text-center relative z-10">
                            {/* Performance Icon and Label */}
                            <div className="flex justify-center mb-6">
                                <div
                                    className={`p-6 rounded-full ${performanceData.bgColor} dark:bg-opacity-10 border-2 ${performanceData.borderColor} dark:border-opacity-30 shadow-inner`}
                                >
                                    <PerformanceIcon
                                        className={`w-16 h-16 ${performanceData.color} dark:text-opacity-90`}
                                    />
                                </div>
                            </div>

                            {/* Quiz Title */}
                            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                                {attempt.quiz?.title || "Quiz Completed"}
                            </h1>
                        <p
                            className={`text-lg font-semibold ${performanceData.color}`}
                        >
                            {performanceData.label} Performance
                        </p>

                        {/* Score Display */}
                        <div className="my-8">
                            <div
                                ref={scoreRef}
                                className={`text-7xl font-black ${performanceData.color} mb-2 transition-all duration-300`}
                            >
                                {animatedScore}%
                            </div>
                            <div className="text-2xl font-semibold text-gray-800">
                                {totalPointsPossible > 0
                                    ? `Score: (${rawScore}/${totalPointsPossible}) points`
                                    : `Score: ${rawScore} points`}
                            </div>
                        </div>

                            {/* Performance Message */}
                            <div className="glass-card bg-white/60 dark:bg-base-300/60 rounded-2xl p-6 mb-8 border border-white/40 dark:border-slate-700 max-w-lg mx-auto">
                                <p
                                    className={`text-lg font-bold ${performanceData.color} dark:text-opacity-90`}
                                >
                                    {performanceData.message}
                                </p>
                            </div>

                            {/* Grading Indicator — shown while AI evaluates written answers */}
                            {gradingInProgress && (
                                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 max-w-lg mx-auto">
                                    <span className="loading loading-spinner loading-sm text-blue-600"></span>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                                            Grading your written answers...
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            Your score will update automatically when grading is complete
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                                <div className="glass-card bg-white/60 dark:bg-base-300/60 rounded-2xl p-6 border border-white/40 dark:border-slate-700 hover:-translate-y-1 transition-transform">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                                        {correctAnswers}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">Correct</p>
                                </div>
                                <div className="glass-card bg-white/60 dark:bg-base-300/60 rounded-2xl p-6 border border-white/40 dark:border-slate-700 hover:-translate-y-1 transition-transform">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        {gradingInProgress && pendingWritten > 0 ? (
                                            <span className="loading loading-spinner loading-sm text-amber-500"></span>
                                        ) : (
                                            <XCircle className="w-6 h-6 text-red-500" />
                                        )}
                                    </div>
                                    <p className="text-4xl font-black text-red-600 dark:text-red-400">
                                        {incorrectAnswers}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">
                                        Incorrect
                                    </p>
                                    {gradingInProgress && pendingWritten > 0 && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                                            +{pendingWritten} pending
                                        </p>
                                    )}
                                </div>
                                <div className="glass-card bg-white/60 dark:bg-base-300/60 rounded-2xl p-6 border border-white/40 dark:border-slate-700 hover:-translate-y-1 transition-transform">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Clock className="w-6 h-6 text-brand-500" />
                                    </div>
                                    <p className="text-4xl font-black text-brand-600 dark:text-brand-400">
                                        {timeTaken !== null ? timeTaken : "--"}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">Minutes</p>
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Submission Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 shrink-0">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1">
                                Submitted On
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {attempt.submittedAt
                                    ? new Date(attempt.submittedAt).toLocaleString()
                                    : "N/A"}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 shrink-0">
                            <Clock className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1">
                                Duration
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {timeTaken !== null
                                    ? `${timeTaken} minute${timeTaken !== 1 ? "s" : ""}`
                                    : "Duration not available"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Answer Breakdown */}
                {attempt.responses && attempt.responses.length > 0 && (
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] mt-8 overflow-hidden">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                <div className="p-2 bg-brand-100 dark:bg-brand-900/40 rounded-lg text-brand-600 dark:text-brand-400">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                Detailed Breakdown
                            </h2>
                            <div className="space-y-4">
                                {attempt.responses.map((response, index) => {
                                    const isWritten = response.questionType === "written";
                                    const isPending = isWritten && response.aiScore === undefined;
                                    const isCorrect = !isPending && response.pointsAwarded > 0;
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`p-6 rounded-2xl border-l-4 transition-all hover:-translate-y-0.5 ${
                                                isPending
                                                    ? "bg-amber-50/50 dark:bg-amber-900/10 border-l-amber-400 border-t border-r border-b border-slate-200 dark:border-slate-700"
                                                    : isCorrect
                                                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-l-emerald-500 border-t border-r border-b border-slate-200 dark:border-slate-700"
                                                        : "bg-red-50/50 dark:bg-red-900/10 border-l-red-500 border-t border-r border-b border-slate-200 dark:border-slate-700"
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                                            Question {index + 1}
                                                            {isWritten && <span className="ml-2 badge badge-info badge-sm">Written</span>}
                                                        </h3>
                                                        {isPending ? (
                                                            <span className="loading loading-spinner loading-xs text-amber-500"></span>
                                                        ) : isCorrect ? (
                                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-500" />
                                                        )}
                                                    </div>
                                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg mb-4">
                                                        {response.prompt || "Question not available"}
                                                    </p>
                                                    
                                                    {isWritten ? (
                                                        <div className="space-y-4">
                                                            <div className="bg-white/50 dark:bg-base-300/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                                                                    <span className="text-slate-500 dark:text-slate-400">Your Answer:</span>
                                                                </p>
                                                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                                    {response.textAnswer || "No answer provided"}
                                                                </p>
                                                            </div>
                                                            
                                                            {response.aiFeedback && (
                                                                <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                                                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                                                        AI Feedback:
                                                                    </p>
                                                                    <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                                                                        {response.aiFeedback}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Pending grading indicator */}
                                                            {isPending && (
                                                                <div className="mt-3 flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                                                                    <span className="loading loading-spinner loading-xs text-amber-500" />
                                                                    <span className="text-amber-700 dark:text-amber-300 font-medium">
                                                                        AI grading in progress...
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Contest / Request Review */}
                                                            {!isPending && response.contestStatus === "pending" ? (
                                                                <div className="mt-3 flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                                                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                                    <span className="text-amber-700 dark:text-amber-300 font-medium">
                                                                        Review requested — waiting for teacher
                                                                    </span>
                                                                </div>
                                                            ) : !isPending && response.contestStatus === "resolved" ? (
                                                                <div className="mt-3 flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                                                        Review completed
                                                                    </span>
                                                                </div>
                                                            ) : !isPending && contestForm?.responseIndex === index ? (
                                                                <div className="mt-3 bg-white dark:bg-base-300 p-4 rounded-xl border border-brand-200 dark:border-brand-800 space-y-3">
                                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                                        Why do you think this should be reviewed?
                                                                    </p>
                                                                    <textarea
                                                                        className="textarea textarea-bordered w-full text-sm"
                                                                        rows={3}
                                                                        maxLength={500}
                                                                        placeholder="Explain why your answer deserves a different score..."
                                                                        value={contestForm.reason}
                                                                        onChange={(e) =>
                                                                            setContestForm((prev) => ({ ...prev, reason: e.target.value }))
                                                                        }
                                                                    />
                                                                    <div className="flex items-center gap-2 justify-end">
                                                                        <button
                                                                            className="btn btn-ghost btn-sm"
                                                                            onClick={() => setContestForm(null)}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-brand btn-sm"
                                                                            disabled={contestSubmitting || !contestForm?.reason?.trim()}
                                                                            onClick={() => handleContestSubmit(index)}
                                                                        >
                                                                            {contestSubmitting ? (
                                                                                <span className="loading loading-spinner loading-xs" />
                                                                            ) : (
                                                                                "Submit Request"
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : !isPending ? (
                                                                <button
                                                                    className="mt-3 btn btn-outline btn-sm gap-2 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                                    onClick={() =>
                                                                        setContestForm({ responseIndex: index, reason: "" })
                                                                    }
                                                                >
                                                                    Request Review
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2 bg-white/50 dark:bg-base-300/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                                <span className="text-slate-500 dark:text-slate-400 mr-2">Your Answer:</span>
                                                                <span className={`font-semibold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                    {response.selectedText?.length > 0 ? response.selectedText.join(", ") : "No answer provided"}
                                                                </span>
                                                            </p>
                                                            {!isCorrect && response.correctText && response.correctText.length > 0 && (
                                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                                                    <span className="text-slate-500 dark:text-slate-400 mr-2">Correct Answer:</span>
                                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                                        {response.correctText.join(", ")}
                                                                    </span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-left sm:text-right shrink-0 bg-white dark:bg-base-300 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm self-start w-full sm:w-auto">
                                                    {isPending ? (
                                                        <>
                                                            <div className="text-3xl font-black text-amber-500 dark:text-amber-400 mb-1">
                                                                -- <span className="text-lg text-slate-400 font-medium">/ {response.points || 1}</span>
                                                            </div>
                                                            <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">
                                                                Pending
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div
                                                                className={`text-3xl font-black mb-1 ${
                                                                    isCorrect
                                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                                        : "text-red-600 dark:text-red-400"
                                                                }`}
                                                            >
                                                                {response.pointsAwarded} <span className="text-lg text-slate-400 font-medium">/ {response.points || 1}</span>
                                                            </div>
                                                            <div
                                                                className={`text-xs font-bold uppercase tracking-wider ${
                                                                    isCorrect
                                                                        ? "text-emerald-600 dark:text-emerald-500"
                                                                        : "text-red-600 dark:text-red-500"
                                                                }`}
                                                            >
                                                                {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 pb-12">
                    <button
                        onClick={() => navigate("/student")}
                        className="btn-brand btn-lg px-8"
                    >
                        <Home className="w-5 h-4" />
                        Back to Dashboard
                    </button>
                    <button
                        onClick={() => navigate("/student")}
                        className="btn btn-outline btn-lg gap-2 bg-white/50 dark:bg-base-300/50 hover:-translate-y-0.5 rounded-2xl border-slate-200 dark:border-slate-700"
                    >
                        <TrendingUp className="w-5 h-5" />
                        View Other Quizzes
                    </button>
                </div>
            </div>
            </main>
        </PageWrapper>
    );
}

export default QuizResultsPage;
