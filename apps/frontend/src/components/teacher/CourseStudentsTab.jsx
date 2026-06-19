import { Users, MessageSquare, UserX } from "lucide-react";
import { SkeletonList } from "../common/Skeleton";
import { EmptyState } from "../common/EmptyState";

export default function CourseStudentsTab({
    studentsLoading,
    enrolledStudents,
    studentGrades,
    courseId,
    setChatCourseId,
    setChatPeerId,
    setChatPeerName,
    setChatOpen,
    handleRemoveStudent
}) {
    return (
        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] shadow-xl overflow-hidden">
            <div className="p-8">
                <h2 className="card-title text-2xl mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    Enrolled Students
                </h2>

                {studentsLoading ? (
                    <div className="py-12">
                        <SkeletonList rows={4} />
                    </div>
                ) : enrolledStudents.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No students yet"
                        description="No students enrolled yet."
                    />
                ) : (
                    <div className="space-y-4">
                        {enrolledStudents.map((enrollment) => {
                            const student = enrollment.user;
                            const grades = studentGrades[student._id] || [];
                            const avgGrade =
                                grades.length > 0
                                    ? Math.round(
                                          grades.reduce(
                                              (sum, g) => sum + g.score,
                                              0,
                                          ) / grades.length,
                                      )
                                    : 0;

                            return (
                                <div
                                    key={enrollment._id}
                                    className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] hover:-translate-y-1 hover:shadow-md transition-all"
                                >
                                    <div className="card-body p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center">
                                                            <span className="text-sm font-bold">
                                                                {student.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                                            {student.name}
                                                        </h3>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                                            {student.email}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                                    <div className="stat stat-sm">
                                                        <div className="stat-title">Quizzes Taken</div>
                                                        <div className="stat-value text-lg">
                                                            {grades.length}
                                                        </div>
                                                    </div>
                                                    <div className="stat stat-sm">
                                                        <div className="stat-title">Average Grade</div>
                                                        <div className="stat-value text-lg text-primary">
                                                            {grades.length > 0 ? `${avgGrade}%` : "N/A"}
                                                        </div>
                                                    </div>
                                                    <div className="stat stat-sm">
                                                        <div className="stat-title">Enrolled</div>
                                                        <div className="stat-value text-sm">
                                                            {new Date(enrollment.createdAt).toLocaleDateString("en-GB")}
                                                        </div>
                                                    </div>
                                                </div>

                                                {grades.length > 0 && (
                                                    <div className="mt-4">
                                                        <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                            Recent Grades:
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {grades.slice(0, 3).map((grade) => (
                                                                <div
                                                                    key={grade.attemptId}
                                                                    className="badge badge-outline gap-1"
                                                                >
                                                                    <span className="truncate max-w-20">
                                                                        {grade.quiz.title}
                                                                    </span>
                                                                    <span className="font-bold">
                                                                        {grade.score}%
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {grades.length > 3 && (
                                                                <div className="badge badge-ghost">
                                                                    +{grades.length - 3} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2 ml-4">
                                                <button
                                                    onClick={() => {
                                                        setChatCourseId(courseId);
                                                        setChatPeerId(student._id);
                                                        setChatPeerName(student.name);
                                                        setChatOpen(true);
                                                    }}
                                                    className="btn btn-outline btn-sm gap-2 w-full"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Chat
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleRemoveStudent(
                                                            student._id,
                                                            student.name,
                                                        )
                                                    }
                                                    className="btn btn-ghost btn-sm text-error gap-2 w-full"
                                                >
                                                    <UserX className="w-4 h-4" />
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
