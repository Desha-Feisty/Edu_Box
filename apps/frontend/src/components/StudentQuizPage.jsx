import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useQuizStore from "../stores/Quizstore";
import useAuthStore from "../stores/Authstore";
import toast from "react-hot-toast";
import axios from "axios";
import {
    ChevronLeft,
    ChevronRight,
    Send,
    CheckCircle,
    Clock,
    AlertTriangle,
    Save,
    AlertCircle,
} from "lucide-react";
import PageWrapper from "./layout/PageWrapper";
import QuizTimer from "./quiz/QuizTimer";

function StudentQuizPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const {
        currentAttempt,
        attemptQuestions,
        submitAnswer,
        submitAttempt,
        fetchAttempt,
        attemptError,
    } = useQuizStore();

    // Function to check if quiz was already submitted
    const checkAttemptResults = useCallback(async (id) => {
        try {
            await axios.get(`/api/attempts/${id}/result`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Results found - navigate to results page
            navigate(`/student/quiz/${id}/results`);
        } catch {
            // No results - quiz might be expired or deleted
            toast.error("Quiz not found or already submitted");
            navigate("/student/quizzes");
        }
    }, [token, navigate]);

    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [gracePeriod, setGracePeriod] = useState(null); // S5: seconds remaining in grace before auto-submit
    const [showWarning, setShowWarning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savingIndices, setSavingIndices] = useState(new Set());
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [lastSavedTimes, setLastSavedTimes] = useState({}); // { questionId: Date }
    
    // Use a ref to track if we've initiated the fetch for this attemptId
    const fetchedAttemptId = useRef(null);
    // Debounce timer ref for proper cleanup between rapid answer changes
    const debounceTimer = useRef(null);
    // Track in-flight save promises so we can flush before submission
    const pendingSaves = useRef(new Map());
    // S3-7: Ref to disable navigation guard after submission
    const submissionLock = useRef(false);

    useEffect(() => {
        // Skip if we've already fetched this attempt
        if (!attemptId || fetchedAttemptId.current === attemptId) {
            return;
        }
        fetchedAttemptId.current = attemptId;
        
        // Fetch attempt data - state reset happens in .then() to avoid cascading renders
        fetchAttempt(attemptId)
                .then((data) => {
                    // S6: Redirect if attempt is already submitted/graded/expired
                    if (data?.attempt?.status && data.attempt.status !== "inProgress") {
                        const status = data.attempt.status;
                        if (status === "graded" || status === "submitted" || status === "late") {
                            navigate(`/student/quiz/${attemptId}/results`);
                        } else {
                            navigate("/student/quizzes");
                        }
                        return;
                    }

                    // Reset local state for new attempt
                    setIsSubmitted(false);
                    setAnswers({});
                    setLastSavedTimes({});
                    
                    // Only load saved answers if the attempt is actually in progress
                    // Don't load answers from completed/submitted/graded attempts
                    if (data && data.responses && data.attempt?.status === "inProgress") {
                        const initialAnswers = {};
                        data.responses.forEach((r) => {
                            if (r.textAnswer) {
                                initialAnswers[r.questionId] = { textAnswer: r.textAnswer };
                            } else if (
                                r.selectedChoiceIds &&
                                r.selectedChoiceIds.length > 0
                            ) {
                                initialAnswers[r.questionId] = r.selectedChoiceIds;
                            }
                        });
                        setAnswers(initialAnswers);
                    }
                })
                .catch((error) => {
                    // Handle 404 - quiz might be already completed/submitted
                    if (error.response?.status === 404) {
                        checkAttemptResults(attemptId);
                    } else {
                        toast.error("Failed to load quiz");
                        console.error("Failed to fetch attempt:", error);
                    }
                });
    }, [attemptId, fetchAttempt, checkAttemptResults]);

    const [selectedQuestionId, setSelectedQuestionId] = useState(null);

    // Derive selected question from attemptQuestions based on selectedQuestionId
    const selectedQuestion = selectedQuestionId
        ? attemptQuestions.find(q => q._id === selectedQuestionId) || attemptQuestions[0] || null
        : (attemptQuestions[0] || null);

    // Initialize selectedQuestionId when attemptQuestions becomes available
    useEffect(() => {
        if (attemptQuestions.length > 0 && !selectedQuestionId) {
             
            setSelectedQuestionId(attemptQuestions[0]._id);
        }
    }, [attemptQuestions, selectedQuestionId]);

    const handleSelectQuestion = (question) => {
        setSelectedQuestionId(question._id);
    };

    const handleAutoSubmit = useCallback(async () => {
        if (isSubmitting || isSubmitted) return;
        
        setGracePeriod(null); // Clear grace period if still active
        setIsSubmitting(true);

        // Flush any pending debounced save before submission
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
        }

        // Wait for any in-flight saves to complete so no answers are lost
        if (pendingSaves.current.size > 0) {
            await Promise.allSettled(
                Array.from(pendingSaves.current.values()),
            );
            pendingSaves.current.clear();
        }

        try {
            const result = await submitAttempt(attemptId);
            if (result) {
                setIsSubmitted(true);
                toast.success("Quiz submitted successfully!");
                // If gradingMode is "onSubmit", show results immediately
                // If gradingMode is "onClose", show submission success page
                if (result.gradingMode === "onSubmit") {
                    navigate(`/student/quiz/${attemptId}/results`);
                } else {
                    navigate(`/student/quiz/${attemptId}/submitted`, {
                        state: { quizEndAt: result.quizEndAt }
                    });
                }
            } else {
                toast.error("Failed to submit quiz. Please try again.");
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error("Failed to submit attempt:", error);
            toast.error("Failed to submit quiz. Please try again.");
            setIsSubmitting(false);
        }
    }, [attemptId, submitAttempt, navigate, isSubmitting, isSubmitted]);

    // S3-7: Warn before leaving the page with unsaved progress
    useEffect(() => {
        if (!currentAttempt?.endAt || currentAttempt?.status !== "inProgress") return;
        const handler = (e) => {
            if (submissionLock.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [currentAttempt?.endAt, currentAttempt?.status]);

    useEffect(() => {
        if (!currentAttempt?.endAt) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const endTime = new Date(currentAttempt.endAt).getTime();
            const remaining = Math.max(0, endTime - now);
            const remainingSeconds = Math.floor(remaining / 1000);

            setTimeRemaining(remainingSeconds);

            if (
                remainingSeconds <= 300 &&
                remainingSeconds > 0 &&
                !showWarning
            ) {
                setShowWarning(true);
                toast.error("⏰ Only 5 minutes remaining!");
            }

            if (remainingSeconds <= 0 && !isSubmitting && !isSubmitted && gracePeriod === null) {
                setGracePeriod(15); // S5: start 15-second grace countdown
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [currentAttempt?.endAt, showWarning, handleAutoSubmit, isSubmitting, isSubmitted, gracePeriod]);

    // S5: Grace period countdown — auto-submits when grace reaches 0
    useEffect(() => {
        if (gracePeriod === null || gracePeriod <= 0) return;
        const timer = setTimeout(() => {
            const next = gracePeriod - 1;
            if (next <= 0) {
                setIsSubmitted(true);
                handleAutoSubmit();
            } else {
                setGracePeriod(next);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [gracePeriod, handleAutoSubmit]);

    const handleAnswerChange = useCallback(
        (questionId, choiceId, textAnswer) => {
            // Clear any pending debounce to avoid cascading stale saves
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }

            // Update optimistic UI immediately
            setAnswers((prev) => {
                const value = textAnswer !== undefined
                    ? { textAnswer }
                    : [choiceId];
                return { ...prev, [questionId]: value };
            });

            setSavingIndices((prev) => new Set(prev).add(questionId));

            // Debounced save with proper cleanup via ref
            debounceTimer.current = setTimeout(async () => {
                const savePromise = textAnswer !== undefined
                    ? submitAnswer(attemptId, questionId, null, textAnswer)
                    : submitAnswer(attemptId, questionId, [choiceId], null);

                // Track promise so we can flush before submit
                pendingSaves.current.set(questionId, savePromise);

                const success = await savePromise;
                pendingSaves.current.delete(questionId);

                if (success) {
                    // C2: Record last-saved timestamp for inline confirmation feedback
                    setLastSavedTimes((prev) => ({ ...prev, [questionId]: new Date() }));
                } else {
                    toast.error("Failed to save answer");
                }

                setSavingIndices((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(questionId);
                    return newSet;
                });
            }, 500);
        },
        [attemptId, submitAnswer],
    );

    const allQuestionsAnswered = attemptQuestions.every((q) => {
        const answer = answers[q._id];
        if (q.questionType === "written") {
            return answer?.textAnswer?.trim()?.length > 0;
        }
        return answer?.length > 0;
    });

    const unansweredCount = attemptQuestions.length - Object.keys(answers).filter((qId) => {
        const answer = answers[qId];
        const question = attemptQuestions.find(q => q._id === qId);
        if (question?.questionType === "written") {
            return answer?.textAnswer?.trim()?.length > 0;
        }
        return answer?.length > 0;
    }).length;

    const currentQuestionIndex = selectedQuestion
        ? attemptQuestions.findIndex((q) => q._id === selectedQuestion._id) + 1
        : 1;

    const answeredCount = Object.keys(answers).filter((qId) => {
        const answer = answers[qId];
        const question = attemptQuestions.find(q => q._id === qId);
        if (question?.questionType === "written") {
            return answer?.textAnswer?.trim()?.length > 0;
        }
        return answer?.length > 0;
    }).length;

    if (!currentAttempt || !attemptQuestions.length) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-base-300 dark:to-base-200 p-6">
                <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
                    {/* Header skeleton */}
                    <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-2xl w-full" />
                    {/* Question nav skeleton */}
                    <div className="flex gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                        ))}
                    </div>
                    {/* Question body skeleton */}
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-3/4" />
                    <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl w-full" />
                    <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl w-full" />
                </div>
            </div>
        );
    }

    return (
        <PageWrapper>
            {/* Header with Timer */}
            <div className="sticky top-0 z-50 py-4 bg-white/70 dark:bg-base-300/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row gap-4 justify-between items-center relative z-10">
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Quiz Attempt
                        </h1>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                            Question {currentQuestionIndex} of {attemptQuestions.length}
                        </p>
                    </div>

                    {/* QuizTimer — reusable component with progress bar */}
                    <QuizTimer
                        endAt={currentAttempt?.endAt}
                        totalDuration={
                            currentAttempt?.startAt && currentAttempt?.endAt
                                ? Math.floor((new Date(currentAttempt.endAt).getTime() - new Date(currentAttempt.startAt).getTime()) / 1000)
                                : undefined
                        }
                        onTimeUp={() => {
                            if (!isSubmitting && !isSubmitted) {
                                setIsSubmitted(true);
                                handleAutoSubmit();
                            }
                        }}
                        showControls={false}
                        minimal
                    />
                </div>

                {/* Warning Banner */}
                {showWarning && (
                    <div className="absolute top-full left-0 w-full bg-orange-100/90 dark:bg-orange-900/80 backdrop-blur-md border-b border-orange-200 dark:border-orange-800 px-6 py-2.5 flex items-center justify-center gap-3 animate-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                        <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                            ⏰ Only {Math.ceil(timeRemaining / 60)} minutes remaining. Quiz will auto-submit when time runs out.
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar - Question Checklist */}
                    <div className="lg:col-span-1">
                        <div className="glass-panel overflow-hidden border border-white/40 dark:border-slate-700/50 shadow-xl sticky top-32 rounded-3xl">
                            <div className="p-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Progress Overview
                                </h2>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-5 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{answeredCount}</span> / {attemptQuestions.length} answered
                                </p>

                                {/* Progress Bar */}
                                <progress
                                    className="progress progress-primary w-full mb-4"
                                    value={answeredCount}
                                    max={attemptQuestions.length}
                                ></progress>

                                {/* Question List */}
                                <div className="space-y-1 max-h-96 overflow-y-auto">
                                    {attemptQuestions.map((question, index) => {
                                        const isAnswered = (() => {
                                            if (question.questionType === "written") {
                                                return answers[question._id]?.textAnswer?.trim()?.length > 0;
                                            }
                                            return answers[question._id]?.length > 0;
                                        })();
                                        const isSelected =
                                            selectedQuestion?._id ===
                                            question._id;

                                        return (
                                            <button
                                                key={question._id}
                                                onClick={() =>
                                                    handleSelectQuestion(
                                                        question,
                                                    )
                                                }
                                                disabled={gracePeriod !== null}
                                                className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                                                    isSelected
                                                        ? "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700"
                                                        : isAnswered
                                                          ? "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800"
                                                          : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                                }`}
                                            >
                                                <div
                                                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        isAnswered
                                                            ? "bg-green-500 text-white"
                                                            : isSelected
                                                              ? "bg-blue-600 text-white"
                                                              : "bg-gray-300 text-gray-600"
                                                    }`}
                                                >
                                                    {isAnswered
                                                        ? "✓"
                                                        : index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                                        Q{index + 1}
                                                    </p>
                                                    {savingIndices.has(
                                                        question._id,
                                                    ) ? (
                                                        <p className="text-xs text-blue-600 flex items-center gap-1">
                                                            <Save className="w-3 h-3" />
                                                            Saving...
                                                        </p>
                                                    ) : lastSavedTimes[question._id] ? (
                                                        <p className="text-xs text-green-600 dark:text-green-400">
                                                            Saved {lastSavedTimes[question._id].toLocaleTimeString()}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Question Area */}
                    <div className="lg:col-span-3">
                        <div className="glass-panel overflow-hidden border border-white/40 dark:border-slate-700/50 shadow-xl rounded-3xl min-h-[60vh]">
                            <div className="p-8 md:p-10 relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                {/* S5: Grace period overlay when time expires */}
                                {gracePeriod !== null && (
                                    <div className="absolute inset-0 bg-base-300/90 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
                                        <div className="text-center p-8 max-w-md">
                                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/25">
                                                <Clock className="w-10 h-10 text-white" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                                Time&apos;s Up!
                                            </h3>
                                            <p className="text-slate-600 dark:text-slate-300 mb-6">
                                                Don&apos;t worry — your answers are being saved. Quiz will auto-submit momentarily.
                                            </p>
                                            <div className="mb-4">
                                                <span className="text-5xl font-bold text-orange-500 dark:text-orange-400">
                                                    {gracePeriod}
                                                </span>
                                                <span className="text-lg text-slate-500 dark:text-slate-400 ml-2">
                                                    seconds remaining
                                                </span>
                                            </div>
                                            <div className="w-64 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-1000"
                                                    style={{ width: `${(gracePeriod / 15) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {selectedQuestion && (
                                    <div className="flex flex-col h-full relative z-10 animate-in fade-in duration-300">
                                        {/* Question Header */}
                                        <div className="mb-8">
                                            <div className="flex items-start justify-between mb-4">
                                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex-1 leading-relaxed">
                                                    {selectedQuestion.prompt}
                                                </h2>
                                                <div className="badge badge-primary ml-4 shrink-0">
                                                    {selectedQuestion.points} pt
                                                    {selectedQuestion.points !==
                                                    1
                                                        ? "s"
                                                        : ""}
                                                </div>
                                            </div>

                                            {/* Auto-save Status */}
                                            {savingIndices.has(
                                                selectedQuestion._id,
                                            ) && (
                                                <div className="flex items-center gap-2 text-blue-600 text-sm">
                                                    <Save className="w-4 h-4 animate-spin" />
                                                    <span>
                                                        Saving your answer...
                                                    </span>
                                                </div>
                                            )}
                                            {!savingIndices.has(
                                                selectedQuestion._id,
                                            ) &&
                                                (() => {
                                                    const answer = answers[selectedQuestion._id];
                                                    if (!answer) return false;
                                                    return Array.isArray(answer)
                                                        ? answer.length > 0
                                                        : (answer.textAnswer?.trim()?.length > 0);
                                                })() && (
                                                    <div className="flex items-center gap-2 text-success text-sm">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span>
                                                            Answer saved
                                                            {lastSavedTimes[selectedQuestion._id] && (
                                                                <span className="text-slate-400 ml-1">
                                                                    · {lastSavedTimes[selectedQuestion._id].toLocaleTimeString()}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                        </div>

                                        {/* Answer Choices */}
                                        <div className="space-y-3 mb-8">
                                            {selectedQuestion.questionType === "written" ? (
                                                <div className="form-control">
                                                    <label className="label">
                                                        <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                                                            Your Answer
                                                        </span>
                                                        <span className="label-text-alt text-slate-500">
                                                            {answers[selectedQuestion._id]?.textAnswer?.length || 0} / 5000 characters
                                                        </span>
                                                    </label>
                                                    <textarea
                                                        value={answers[selectedQuestion._id]?.textAnswer || ""}
                                                        onChange={(e) => {
                                                            if (e.target.value.length <= 5000) {
                                                                handleAnswerChange(
                                                                    selectedQuestion._id,
                                                                    null,
                                                                    e.target.value,
                                                                );
                                                            }
                                                        }}
                                                        disabled={isSubmitting || gracePeriod !== null}
                                                        className="textarea h-48 bg-white/50 dark:bg-base-300/50 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-xl text-base resize-y"
                                                        placeholder="Type your answer here..."
                                                    />
                                                </div>
                                            ) : (
                                                selectedQuestion.choices &&
                                                selectedQuestion.choices.length >
                                                    0 ? (
                                                    selectedQuestion.choices.map(
                                                        (choice) => {
                                                            const isSelected =
                                                                answers[
                                                                    selectedQuestion
                                                                        ._id
                                                                ]?.includes(
                                                                    choice._id,
                                                                ) ?? false;

                                                            return (
                                                                <label
                                                                    key={choice._id}
                                                                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                                        isSelected
                                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                                            : "border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-400/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        name={`question-${selectedQuestion._id}`}
                                                                        value={
                                                                            choice._id
                                                                        }
                                                                        checked={
                                                                            isSelected
                                                                        }
                                                                        onChange={() =>
                                                                            handleAnswerChange(
                                                                                selectedQuestion._id,
                                                                                choice._id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isSubmitting || gracePeriod !== null
                                                                        }
                                                                        className="radio radio-primary mt-1 shrink-0"
                                                                    />
                                                                    <span
                                                                        className={`ml-4 text-base ${
                                                                            isSelected
                                                                                ? "font-semibold text-slate-900 dark:text-white"
                                                                                : "text-slate-700 dark:text-slate-300"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            choice.text
                                                                        }
                                                                    </span>
                                                                    {isSelected && (
                                                                        <CheckCircle className="w-5 h-5 text-blue-600 ml-auto shrink-0" />
                                                                    )}
                                                                </label>
                                                            );
                                                        },
                                                    )
                                                ) : (
                                                    <div className="alert alert-info">
                                                        <AlertCircle className="w-5 h-5" />
                                                        <span>
                                                            No choices available
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {/* Navigation */}
                                        <div className="divider my-6"></div>

                                        <div className="flex gap-4 items-center justify-between">
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => {
                                                        const idx =
                                                            attemptQuestions.findIndex(
                                                                (q) =>
                                                                    q._id ===
                                                                    selectedQuestion._id,
                                                            );
                                                        if (idx > 0) {
                                                            handleSelectQuestion(
                                                                attemptQuestions[
                                                                    idx - 1
                                                                ],
                                                            );
                                                        }
                                                    }}
                                                    disabled={
                                                        attemptQuestions.findIndex(
                                                            (q) =>
                                                                q._id ===
                                                                selectedQuestion._id,
                                                        ) === 0 || isSubmitting || gracePeriod !== null
                                                    }
                                                    className="btn btn-ghost gap-2"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                    Previous
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        const idx =
                                                            attemptQuestions.findIndex(
                                                                (q) =>
                                                                    q._id ===
                                                                    selectedQuestion._id,
                                                            );
                                                        if (
                                                            idx <
                                                            attemptQuestions.length -
                                                                1
                                                        ) {
                                                            handleSelectQuestion(
                                                                attemptQuestions[
                                                                    idx + 1
                                                                ],
                                                            );
                                                        }
                                                    }}
                                                    disabled={
                                                        attemptQuestions.findIndex(
                                                            (q) =>
                                                                q._id ===
                                                                selectedQuestion._id,
                                                        ) ===
                                                            attemptQuestions.length -
                                                                1 ||
                                                        isSubmitting || gracePeriod !== null
                                                    }
                                                    className="btn btn-ghost gap-2"
                                                >
                                                    Next
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    if (!allQuestionsAnswered) {
                                                        if (!window.confirm(
                                                            `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Submit anyway?`
                                                        )) return;
                                                    }
                                                    handleAutoSubmit();
                                                }}
                                                disabled={isSubmitting || gracePeriod !== null}
                                                className="btn btn-success gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <span className="loading loading-spinner loading-xs"></span>
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-5 h-5" />
                                                        Submit Quiz
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Incomplete Warning */}
                                        {!allQuestionsAnswered && (
                                            <div className="alert alert-warning mt-6">
                                                <AlertTriangle className="w-5 h-5" />
                                                <span>
                                                    {unansweredCount} question{unansweredCount > 1 ? "s" : ""} unanswered. You can still submit.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Attempt Error Toast */}
            {attemptError && (
                <div className="toast toast-end">
                    <div className="alert alert-error">
                        <span>{attemptError}</span>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
}

export default StudentQuizPage;
