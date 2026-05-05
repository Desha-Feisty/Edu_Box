import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useQuizStore from "../stores/Quizstore";
import useAuthStore from "../stores/Authstore";
import axios from "axios";
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
import Navbar from "./layout/Navbar";

function QuizResultsPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const { currentAttempt } = useQuizStore();
    const { token } = useAuthStore();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    if (loading) {
        return (
            <PageWrapper>
                <div className="min-h-[80vh] flex items-center justify-center">
                    <span className="loading loading-spinner loading-lg text-blue-600"></span>
                </div>
            </PageWrapper>
        );
    }

    if (error) {
        return (
            <PageWrapper>
                <Navbar />
                <div className="min-h-[80vh] flex items-center justify-center px-6 relative z-10">
                    <div className="glass-panel max-w-md w-full border border-white/40 dark:border-slate-700/50 shadow-xl rounded-3xl p-8 text-center text-red-600 dark:text-red-400">
                        <p className="text-xl font-bold mb-6">{error}</p>
                        <button
                            onClick={() => navigate("/student")}
                            className="btn btn-primary gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
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
                <Navbar />
                <div className="min-h-[80vh] flex items-center justify-center px-6 relative z-10">
                    <div className="glass-panel max-w-md w-full border border-white/40 dark:border-slate-700/50 shadow-xl rounded-3xl p-8 text-center">
                        <p className="text-slate-600 dark:text-slate-400 text-lg font-bold mb-6">
                            Results not found
                        </p>
                        <button
                            onClick={() => navigate("/student")}
                            className="btn btn-primary gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    // Calculate stats
    const rawScore = Number.isFinite(attempt.score)
        ? attempt.score
        : attempt.responses?.reduce(
              (sum, r) =>
                  sum +
                  (Number.isFinite(r.pointsAwarded) ? r.pointsAwarded : 0),
              0,
          );
    const totalPointsPossible = attempt.responses?.length || 0;
    const scorePercentage =
        totalPointsPossible > 0
            ? Math.round((rawScore / totalPointsPossible) * 100)
            : 0;

    const correctAnswers =
        attempt.responses?.filter((r) => r.pointsAwarded > 0).length || 0;
    const incorrectAnswers = (attempt.responses?.length || 0) - correctAnswers;

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

    const performance = getPerformanceData(scorePercentage);
    const PerformanceIcon = performance.icon;

    const timeTaken = (() => {
        if (!attempt.submittedAt || (!attempt.startedAt && !attempt.startAt)) {
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

    return (
        <PageWrapper>
            <Navbar />
            <main className="min-h-screen py-12 px-6 animate-in fade-in duration-500 relative z-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Main Results Card */}
                    <div
                        className={`glass-panel overflow-hidden border shadow-2xl relative rounded-3xl ${performance.borderColor} dark:border-slate-700/50`}
                    >
                        <div className={`absolute top-0 left-0 w-full h-2 ${performance.bgColor} dark:bg-opacity-20`}></div>
                        <div className="p-12 text-center relative z-10">
                            {/* Performance Icon and Label */}
                            <div className="flex justify-center mb-6">
                                <div
                                    className={`p-6 rounded-full ${performance.bgColor} dark:bg-opacity-10 border-2 ${performance.borderColor} dark:border-opacity-30 shadow-inner`}
                                >
                                    <PerformanceIcon
                                        className={`w-16 h-16 ${performance.color} dark:text-opacity-90`}
                                    />
                                </div>
                            </div>

                            {/* Quiz Title */}
                            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                                {attempt.quiz?.title || "Quiz Completed"}
                            </h1>
                        <p
                            className={`text-lg font-semibold ${performance.color}`}
                        >
                            {performance.label} Performance
                        </p>

                        {/* Score Display */}
                        <div className="my-8">
                            <div
                                className={`text-7xl font-black ${performance.color} mb-2`}
                            >
                                {scorePercentage}%
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
                                    className={`text-lg font-bold ${performance.color} dark:text-opacity-90`}
                                >
                                    {performance.message}
                                </p>
                            </div>

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
                                        <XCircle className="w-6 h-6 text-red-500" />
                                    </div>
                                    <p className="text-4xl font-black text-red-600 dark:text-red-400">
                                        {incorrectAnswers}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">
                                        Incorrect
                                    </p>
                                </div>
                                <div className="glass-card bg-white/60 dark:bg-base-300/60 rounded-2xl p-6 border border-white/40 dark:border-slate-700 hover:-translate-y-1 transition-transform">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Clock className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <p className="text-4xl font-black text-blue-600 dark:text-blue-400">
                                        {timeTaken !== null ? timeTaken : "--"}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">Minutes</p>
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Submission Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 border border-white/40 dark:border-slate-700/50 shadow-lg rounded-2xl flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
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
                    <div className="glass-panel p-6 border border-white/40 dark:border-slate-700/50 shadow-lg rounded-2xl flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 shrink-0">
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
                    <div className="glass-panel overflow-hidden border border-white/40 dark:border-slate-700/50 shadow-xl rounded-3xl mt-8">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                Detailed Breakdown
                            </h2>
                            <div className="space-y-4">
                                {attempt.responses.map((response, index) => {
                                    const isCorrect = response.pointsAwarded > 0;
                                    return (
                                        <div
                                            key={index}
                                            className={`p-6 rounded-2xl border-l-4 transition-all hover:-translate-y-0.5 ${
                                                isCorrect
                                                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-l-emerald-500 border-t border-r border-b border-slate-200 dark:border-slate-700"
                                                    : "bg-red-50/50 dark:bg-red-900/10 border-l-red-500 border-t border-r border-b border-slate-200 dark:border-slate-700"
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                                            Question {index + 1}
                                                        </h3>
                                                        {isCorrect ? (
                                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-500" />
                                                        )}
                                                    </div>
                                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg mb-4">
                                                        {response.prompt || "Question not available"}
                                                    </p>
                                                    
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
                                                </div>
                                                <div className="text-left sm:text-right shrink-0 bg-white dark:bg-base-300 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm self-start w-full sm:w-auto">
                                                    <div
                                                        className={`text-3xl font-black mb-1 ${
                                                            isCorrect
                                                                ? "text-emerald-600 dark:text-emerald-400"
                                                                : "text-red-600 dark:text-red-400"
                                                        }`}
                                                    >
                                                        {response.pointsAwarded} <span className="text-lg text-slate-400 font-medium">/ 1</span>
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
                        className="btn btn-primary btn-lg gap-2 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 rounded-2xl"
                    >
                        <Home className="w-5 h-5" />
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
