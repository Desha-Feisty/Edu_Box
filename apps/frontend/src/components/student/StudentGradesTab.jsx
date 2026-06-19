import { Award, Lock } from "lucide-react";
import AnalyticsDashboard from "../AnalyticsDashboard";
import { EmptyState } from "../common/EmptyState";

export default function StudentGradesTab({
    gradesLoading,
    gradesError,
    myGrades,
    viewContentCourse
}) {
    const isGradeAvailable = (grade) => {
        if (grade.isAvailable === false) return false;
        if (grade.gradingMode === "onSubmit") return true;
        if (!grade.closeAt) return true;
        return new Date(grade.closeAt) <= new Date();
    };

    const formatCloseAt = (closeAt) => {
        if (!closeAt) return "";
        return new Date(closeAt).toLocaleString();
    };

    return (
        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden shadow-sm">
            <div className="p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900 dark:text-white">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                        <Award className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    My Grade History
                </h2>

                {viewContentCourse && (
                    <div className="mb-10">
                        <AnalyticsDashboard courseId={viewContentCourse._id} mode="student" />
                    </div>
                )}

                {gradesLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <span className="loading loading-spinner loading-lg text-emerald-500"></span>
                    </div>
                ) : gradesError ? (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/50">
                        <span>{gradesError}</span>
                    </div>
                ) : myGrades.length === 0 ? (
                    <EmptyState
                        icon={Award}
                        title="No grades yet"
                        description="No graded attempts available yet."
                    />
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50">
                        <table className="table w-full">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <tr>
                                    <th className="font-semibold">Quiz</th>
                                    <th className="font-semibold">Course</th>
                                    <th className="font-semibold">Score</th>
                                    <th className="font-semibold">Date</th>
                                    <th className="font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {myGrades.map((grade) => {
                                    const available = isGradeAvailable(grade);
                                    return (
                                        <tr key={grade.attemptId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="font-medium text-slate-900 dark:text-slate-200">
                                                {grade.quiz?.title || "Unnamed Quiz"}
                                            </td>
                                            <td className="text-slate-600 dark:text-slate-400">
                                                {grade.course?.title || "Unknown Course"}
                                            </td>
                                            <td className="font-bold text-lg text-slate-900 dark:text-white">
                                                {available ? (
                                                    `${grade.score}%`
                                                ) : (
                                                    <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-sm font-normal">
                                                        <Lock className="w-3 h-3" />
                                                        Available {formatCloseAt(grade.closeAt)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-slate-600 dark:text-slate-400 text-sm">
                                                {grade.submittedAt
                                                    ? new Date(grade.submittedAt).toLocaleString()
                                                    : "-"}
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge badge-sm font-medium ${
                                                        !available
                                                            ? "badge-neutral bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600/50"
                                                            : grade.status === "graded"
                                                                ? "badge-success bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50"
                                                                : grade.status === "late"
                                                                    ? "badge-warning bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50"
                                                                    : "badge-error bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50"
                                                    }`}
                                                >
                                                    {!available ? "pending" : grade.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
