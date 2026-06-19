import { BookOpen, MessageSquare, ChevronRight } from "lucide-react";
import { EmptyState } from "../common/EmptyState";

export default function StudentCoursesTab({
    allCourses,
    setChatCourseId,
    setChatPeerId,
    setChatPeerName,
    setIsChatOpen,
    setViewContentCourse,
    loadCourseContentNotes
}) {
    return (
        <div>
            {allCourses.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="No courses yet"
                    description="You haven't joined any courses yet. Use a join code to get started!"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allCourses.map((course) => (
                        <div
                            key={course._id}
                            className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] group cursor-pointer hover:shadow-md transition-all"
                        >
                            <div className="card-body p-5">
                                <h3 className="card-title text-lg text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors line-clamp-1">
                                    {course.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                                    {course.description}
                                </p>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                        Joined{" "}
                                        {new Date(
                                            course.enrolledAt,
                                        ).toLocaleDateString("en-GB")}
                                    </span>
                                    <span className="badge badge-primary badge-sm shadow-sm">
                                        Active
                                    </span>
                                </div>
                            </div>
                            <div className="card-actions border-t border-slate-200 dark:border-slate-700/50 pt-4 px-5 pb-5">
                                <div className="flex flex-col gap-2 w-full">
                                    <button
                                        onClick={() => {
                                            setChatCourseId(
                                                course._id,
                                            );
                                            setChatPeerId(
                                                course.teacher
                                                    ?._id ||
                                                    course.teacher,
                                            );
                                            setChatPeerName(
                                                course.teacher
                                                    ?.name ||
                                                    "Teacher",
                                            );
                                            setIsChatOpen(true);
                                        }}
                                        className="btn btn-outline btn-sm gap-2 w-full text-slate-700 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Chat with Teacher
                                    </button>
                                    <button
                                        onClick={() => {
                                            setViewContentCourse(
                                                course,
                                            );
                                            loadCourseContentNotes(
                                                course._id,
                                            );
                                        }}
                                        className="btn btn-ghost btn-sm gap-2 w-full hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                                    >
                                        View Content
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
