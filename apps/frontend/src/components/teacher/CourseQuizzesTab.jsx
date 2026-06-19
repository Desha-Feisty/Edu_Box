import { useState } from "react";
import { BookOpen, CheckCircle, Clock, Eye, Trash2, Plus } from "lucide-react";
import { ConfirmDialog } from "../common/Modal";
import { formatDateLong as formatDate } from "../../lib/dates";
import { EmptyState } from "../common/EmptyState";

export default function CourseQuizzesTab({
    quizzes,
    navigate,
    handlePublishQuiz,
    handleUnpublishQuiz,
    handleDeleteQuiz,
    courseId,
}) {
    const [confirmState, setConfirmState] = useState({ action: null, quizId: null });

    const confirmConfig = {
        publish: {
            title: "Publish Quiz",
            message: "Publish this quiz? Students will be able to see and attempt it.",
            confirmLabel: "Publish",
            variant: "success",
            handler: (id) => { handlePublishQuiz(id); setConfirmState({ action: null, quizId: null }); },
        },
        unpublish: {
            title: "Unpublish Quiz",
            message: "Unpublish this quiz? Students will no longer be able to access it.",
            confirmLabel: "Unpublish",
            variant: "warning",
            handler: (id) => { handleUnpublishQuiz(id); setConfirmState({ action: null, quizId: null }); },
        },
        delete: {
            title: "Delete Quiz",
            message: "Delete this quiz? This action cannot be undone.",
            confirmLabel: "Delete",
            variant: "danger",
            handler: (id) => { handleDeleteQuiz(id); setConfirmState({ action: null, quizId: null }); },
        },
    };

    const activeConfig = confirmConfig[confirmState.action];
    const sortedQuizzes = [...quizzes].sort((a, b) => {
        const dateA = new Date(a.openAt || 0);
        const dateB = new Date(b.openAt || 0);
        return dateB - dateA;
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {quizzes.length} {quizzes.length === 1 ? "Quiz" : "Quizzes"}
                </h2>
                <button
                    onClick={() => navigate(`/teacher/quiz/create?courseId=${courseId}`)}
                    className="btn-brand"
                >
                    <Plus className="w-4 h-4" />
                    Create Quiz
                </button>
            </div>

            {/* Quiz List */}
            {quizzes.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="No quizzes yet"
                    description="No quizzes created yet."
                    actionLabel="Create Your First Quiz"
                    onAction={() => navigate(`/teacher/quiz/create?courseId=${courseId}`)}
                />
            ) : (
                sortedQuizzes.map((quiz) => (
                    <div
                        key={quiz._id}
                        className="bg-white dark:bg-base-200 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10 transition-all overflow-hidden group"
                    >
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {quiz.title}
                                        </h3>
                                        {quiz.published ? (
                                            <span className="badge badge-success badge-sm py-2.5 shadow-sm shadow-success/20 gap-1 text-white px-3 font-medium">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Published
                                            </span>
                                        ) : (
                                            <span className="badge badge-warning badge-sm py-2.5 shadow-sm shadow-warning/20 gap-1 text-warning-content px-3 font-medium">
                                                Draft
                                            </span>
                                        )}
                                    </div>
                                    {quiz.description && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                            {quiz.description}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                                            <span>Open: <span className="text-slate-700 dark:text-slate-300">{formatDate(quiz.openAt)}</span></span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <Clock className="w-3.5 h-3.5 text-orange-500" />
                                            <span>Close: <span className="text-slate-700 dark:text-slate-300">{formatDate(quiz.closeAt)}</span></span>
                                        </div>
                                        {quiz.questionsPerAttempt && (
                                            <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/50">
                                                <span className="text-purple-600 dark:text-purple-400">{quiz.questionsPerAttempt} questions/attempt</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <Clock className="w-3.5 h-3.5 text-green-500" />
                                            <span>{quiz.durationMinutes} min</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                                    {!quiz.published ? (
                                        <button
                                                        onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmState({ action: "publish", quizId: quiz._id });
                                            }}
                                            className="btn btn-success btn-sm text-white shadow-md shadow-success/20 gap-2 w-full sm:w-auto hover:-translate-y-0.5 transition-transform"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Publish
                                        </button>
                                    ) : (
                                        <button
                                                    onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmState({ action: "unpublish", quizId: quiz._id });
                                            }}
                                            className="btn btn-warning btn-sm text-warning-content shadow-md shadow-warning/20 gap-2 w-full sm:w-auto hover:-translate-y-0.5 transition-transform"
                                        >
                                            <Clock className="w-4 h-4" />
                                            Unpublish
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/teacher/quiz/${quiz._id}/questions`); }}
                                        className="btn btn-outline border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 btn-sm gap-2 w-full sm:w-auto dark:text-slate-300 hover:-translate-y-0.5 transition-transform"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Questions
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmState({ action: "delete", quizId: quiz._id });
                                        }}
                                        className="btn btn-ghost text-red-500 dark:text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 btn-sm gap-2 w-full sm:w-auto"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {/* Confirmation Dialog */}
            {activeConfig && (
                <ConfirmDialog
                    isOpen={confirmState.action !== null}
                    onClose={() => setConfirmState({ action: null, quizId: null })}
                    onConfirm={() => activeConfig.handler(confirmState.quizId)}
                    title={activeConfig.title}
                    message={activeConfig.message}
                    confirmLabel={activeConfig.confirmLabel}
                    variant={activeConfig.variant}
                />
            )}
        </div>
    );
}
