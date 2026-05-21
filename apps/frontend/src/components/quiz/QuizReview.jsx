import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import useAuthStore from "../../stores/Authstore";
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    Clock,
    ArrowRight,
    RotateCcw,
    FileText,
    Award,
    Target,
    Zap,
} from "lucide-react";

function QuizReview({ attemptId, onClose }) {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [attempt, setAttempt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const fetchAttemptDetails = async () => {
            if (!attemptId || !token) return;
            
            setIsLoading(true);
            try {
                const res = await axios.get(`/api/attempts/${attemptId}/review`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setAttempt(res.data);
            } catch (err) {
                console.error("Failed to fetch attempt:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttemptDetails();
    }, [attemptId, token]);

    const handleNext = () => {
        if (attempt?.responses && selectedIndex < attempt.responses.length - 1) {
            setSelectedIndex(selectedIndex + 1);
        }
    };

    const handlePrev = () => {
        if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
        }
    };

    const handleRetry = () => {
        const quizId = attempt?.quiz?._id;
        if (quizId) {
            onClose?.();
            navigate(`/student/quiz/start/${quizId}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-violet-200 dark:border-violet-700 border-t-violet-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!attempt) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    No attempt found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    This quiz attempt could not be found
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-2xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors"
                >
                    Go back
                </button>
            </div>
        );
    }

    const { attempt: attemptData, quiz, responses } = attempt;
    const correctCount = responses?.filter((r) => r.pointsAwarded > 0).length || 0;
    const totalQuestions = responses?.length || 0;
    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto p-6 space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                </button>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRetry}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Retry Quiz
                    </button>
                </div>
            </div>

            {/* Score Card */}
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`relative overflow-hidden rounded-3xl p-8 ${
                    scorePercentage >= 80
                        ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10"
                        : scorePercentage >= 60
                            ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10"
                            : "bg-gradient-to-br from-red-500/10 to-pink-500/10"
                }`}
            >
                <div className="relative flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            Quiz Results
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-lg">
                            {quiz?.title}
                        </p>
                    </div>

                    {/* Score Circle */}
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-slate-200 dark:text-slate-700"
                            />
                            <motion.circle
                                cx="64"
                                cy="64"
                                r="56"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={352}
                                initial={{ strokeDashoffset: 352 }}
                                animate={{
                                    strokeDashoffset: 352 - (352 * scorePercentage) / 100,
                                }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={
                                    scorePercentage >= 80
                                        ? "text-green-500"
                                        : scorePercentage >= 60
                                            ? "text-amber-500"
                                            : "text-red-500"
                                }
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-slate-900 dark:text-white">
                                {scorePercentage}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 dark:text-green-400 font-medium">
                            {correctCount} Correct
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-600 dark:text-red-400 font-medium">
                            {totalQuestions - correctCount} Incorrect
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-500" />
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {attemptData?.submittedAt
                                ? new Date(attemptData.submittedAt).toLocaleString()
                                : "N/A"}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Question Navigator */}
            <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Question {selectedIndex + 1} of {totalQuestions}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrev}
                            disabled={selectedIndex === 0}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={selectedIndex === totalQuestions - 1}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Question Dots */}
                <div className="flex flex-wrap gap-2">
                    {responses?.map((response, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                                selectedIndex === index
                                    ? "ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-base-200"
                                    : ""
                            } ${
                                response.pointsAwarded > 0
                                    ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                    : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                            }`}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>
            </div>

            {/* Current Question Detail */}
            <AnimatePresence mode="wait">
                {responses?.[selectedIndex] && (
                    <motion.div
                        key={selectedIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md"
                    >
                        {/* Question */}
                        <div className="mb-6">
                            <div className="flex items-start gap-3 mb-4">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                    responses[selectedIndex].pointsAwarded > 0
                                        ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                        : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                }`}>
                                    {responses[selectedIndex].pointsAwarded > 0 ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <XCircle className="w-5 h-5" />
                                    )}
                                </span>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex-1">
                                    {responses[selectedIndex].prompt}
                                </h3>
                            </div>

                            {/* Points */}
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Points: {responses[selectedIndex].pointsAwarded} /{" "}
                                {responses[selectedIndex].points}
                            </p>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Your Answer:
                            </p>
                            {responses[selectedIndex].choices?.map((choice, index) => {
                                const isSelected =
                                    responses[selectedIndex].selectedChoiceIds?.some(
                                        (id) =>
                                            id.toString() === choice._id?.toString()
                                    );
                                const isCorrect = choice.isCorrect;

                                return (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors ${
                                            isCorrect
                                                ? "border-green-500 bg-green-50 dark:bg-green-500/10"
                                                : isSelected
                                                    ? "border-red-500 bg-red-50 dark:bg-red-500/10"
                                                    : "border-slate-200 dark:border-slate-700"
                                        }`}
                                    >
                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                isCorrect
                                                    ? "bg-green-500"
                                                    : isSelected
                                                        ? "bg-red-500"
                                                        : "bg-slate-200 dark:bg-slate-700"
                                            }`}
                                        >
                                            {isCorrect ? (
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            ) : isSelected ? (
                                                <XCircle className="w-4 h-4 text-white" />
                                            ) : null}
                                        </div>
                                        <span
                                            className={
                                                isCorrect
                                                    ? "font-medium text-green-700 dark:text-green-300"
                                                    : isSelected
                                                        ? "font-medium text-red-700 dark:text-red-300"
                                                        : "text-slate-700 dark:text-slate-300"
                                            }
                                        >
                                            {choice.text}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Explanation (if available) */}
                        {responses[selectedIndex].pointsAwarded === 0 && (
                            <div className="mt-6 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                    Incorrect Answer
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    The correct answer is:{" "}
                                    {responses[selectedIndex].choices?.find(
                                        (c) => c.isCorrect
                                    )?.text}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700/50">
                <button
                    onClick={handlePrev}
                    disabled={selectedIndex === 0}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Previous
                </button>

                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors"
                >
                    Done Reviewing
                    <ArrowRight className="w-5 h-5" />
                </button>

                <button
                    onClick={handleNext}
                    disabled={selectedIndex === totalQuestions - 1}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
    );
}

export default QuizReview;