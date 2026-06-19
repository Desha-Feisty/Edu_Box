import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/Authstore";
import useTeacherStore from "../stores/Teacherstore";
import Leaderboard from "../components/Leaderboard";
import { Trophy } from "lucide-react";
import { EmptyState } from "../components/common/EmptyState";

function LeaderboardPage() {
    const { token, role } = useAuthStore();
    const { allCourses, listMyCourses } = useTeacherStore();
    const navigate = useNavigate();

    const [selectedCourseId, setSelectedCourseId] = useState("");

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        if (role === "student" || role === "teacher") {
            listMyCourses();
        }
    }, [token, navigate, role, listMyCourses]);



    const isTeacher = role === "teacher";

    return (
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Leaderboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        See how you rank against your peers
                    </p>
                </div>

                {/* Course Selector */}
                {role !== "admin" && allCourses.length > 0 && (
                    <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 mb-8">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <span className="text-sm font-medium text-slate-500">
                                Select Course:
                            </span>
                            <select
                                className="select select-bordered select-sm bg-white dark:bg-base-300 rounded-xl focus:ring-2 focus:ring-yellow-500/50 min-w-[250px]"
                                value={selectedCourseId || (allCourses.length > 0 ? allCourses[0]._id : "")}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                            >
                                {allCourses.map((course) => (
                                    <option key={course._id} value={course._id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Leaderboard */}
                {role === "admin" ? (
                    <EmptyState
                        icon={Trophy}
                        title="Leaderboard for Students & Teachers"
                        description="Leaderboard is available for students and teachers."
                    />
                ) : allCourses.length > 0 ? (
                    <Leaderboard
                        courseId={selectedCourseId || allCourses[0]._id}
                        isTeacher={isTeacher}
                    />
                ) : (
                    <EmptyState
                        icon={Trophy}
                        title="No courses"
                        description={role === "student"
                            ? "Join a course to see the leaderboard!"
                            : "Create a course to see the leaderboard!"}
                    />
                )}
            </main>
    );
}

export default LeaderboardPage;