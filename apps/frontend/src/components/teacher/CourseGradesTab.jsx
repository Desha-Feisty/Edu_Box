import { Award, Download, Table } from "lucide-react";
import useAuthStore from "../../stores/Authstore.js";
import { exportBlob } from "../../lib/exportCSV.js";
import { EmptyState } from "../common/EmptyState";

export default function CourseGradesTab({
    quizzes,
    selectedQuiz,
    setSelectedQuiz,
    selectedQuizTitle,
    setSelectedQuizTitle,
    gradesLoading,
    gradesError,
    quizGrades,
    courseId
}) {
    const { token } = useAuthStore();
    
    const exportQuizGrades = (quizId, quizTitle) => {
        const filename = `quiz-grades-${quizTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;
        return exportBlob(`/api/quizzes/${quizId}/grades/export`, filename, token);
    };
    
    const exportCourseGrades = () => {
        return exportBlob(`/api/courses/${courseId}/grades/export`, "course-grades.csv", token);
    };
    
    const exportGradesMatrix = () => {
        return exportBlob(`/api/courses/${courseId}/grades/matrix-export`, "course-grades-matrix.csv", token);
    };
    
    return (
        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] shadow-xl overflow-hidden">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="card-title text-2xl flex items-center gap-2 text-slate-900 dark:text-white">
                        <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        Student Grades by Quiz
                    </h2>
                    {quizzes.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={exportCourseGrades}
                                className="btn btn-sm btn-outline gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export All Grades
                            </button>
                            <button
                                onClick={exportGradesMatrix}
                                className="btn btn-sm btn-outline gap-2"
                            >
                                <Table className="w-4 h-4" />
                                Export Matrix
                            </button>
                        </div>
                    )}
                </div>

                {quizzes.length === 0 ? (
                    <EmptyState
                        icon={Award}
                        title="No quizzes yet"
                        description="No quizzes available yet. Create a quiz to see student grades."
                    />
                ) : (
                    <div className="space-y-6">
                        {/* Quiz Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {quizzes.map((quiz) => (
                                <button
                                    key={quiz._id}
                                    onClick={() => {
                                        setSelectedQuiz(quiz._id);
                                        setSelectedQuizTitle(quiz.title);
                                    }}
                                    className={`card transition-all cursor-pointer border ${
                                        selectedQuiz === quiz._id
                                            ? "border-blue-500 shadow-md bg-blue-50 dark:bg-blue-900/20"
                                            : "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:shadow-md"
                                    }`}
                                >
                                    <div className="card-body p-4">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                            {quiz.title}
                                        </h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                            {quiz.description}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Grades Table */}
                        {selectedQuiz && (
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        Grades for: {selectedQuizTitle}
                                    </h3>
                                    <button
                                        onClick={() => exportQuizGrades(selectedQuiz, selectedQuizTitle)}
                                        className="btn btn-sm btn-outline gap-2"
                                        disabled={gradesLoading || quizGrades.length === 0}
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                </div>

                                {gradesLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <span className="loading loading-spinner loading-lg text-blue-600"></span>
                                    </div>
                                ) : gradesError ? (
                                    <div className="alert alert-error">
                                        <span>{gradesError}</span>
                                    </div>
                                ) : quizGrades.length === 0 ? (
                                    <EmptyState
                                        icon={Award}
                                        title="No grades yet"
                                        description="No graded submissions found yet."
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="table table-zebra w-full">
                                            <thead className="bg-slate-50 dark:bg-slate-800">
                                                <tr>
                                                    <th className="text-slate-700 dark:text-slate-200 font-semibold">Name</th>
                                                    <th className="text-slate-700 dark:text-slate-200 font-semibold">Email</th>
                                                    <th className="text-slate-700 dark:text-slate-200 font-semibold">Score</th>
                                                    <th className="text-slate-700 dark:text-slate-200 font-semibold">Submitted</th>
                                                    <th className="text-slate-700 dark:text-slate-200 font-semibold">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {quizGrades.map((grade) => (
                                                    <tr key={grade.attemptId}>
                                                        <td className="font-medium text-slate-900 dark:text-white">
                                                            {grade.student?.name || "Unknown"}
                                                        </td>
                                                        <td className="text-slate-600 dark:text-slate-300">
                                                            {grade.student?.email || "-"}
                                                        </td>
                                                        <td className="font-bold text-lg text-slate-900 dark:text-white">
                                                            {grade.rawScore || `${grade.score}%`}
                                                        </td>
                                                        <td className="text-slate-600 dark:text-slate-300">
                                                            {grade.submittedAt
                                                                ? new Date(grade.submittedAt).toLocaleString()
                                                                : "-"}
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`badge ${
                                                                    grade.status === "graded"
                                                                        ? "badge-success"
                                                                        : grade.status === "late"
                                                                        ? "badge-warning"
                                                                        : "badge-error"
                                                                }`}
                                                            >
                                                                {grade.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
