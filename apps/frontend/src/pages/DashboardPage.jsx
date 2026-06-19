import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import useAuthStore from "../stores/Authstore";
import useTeacherStore from "../stores/Teacherstore";
import useQuizStore from "../stores/Quizstore";
import { motion } from "framer-motion";
import ProgressCard from "../components/dashboard/ProgressCard";
import CourseCalendar from "../components/dashboard/CourseCalendar";
import {
    BookOpen,
    Zap,
    FileText,
    TrendingUp,
    Clock,
    Award,
    ArrowRight,
    Calendar,
    BarChart3,
    Users,
    PlusCircle,
    ClipboardList,
    GraduationCap,
} from "lucide-react";

function DashboardPage() {
    const navigate = useNavigate();
    const { user, role, token, listEnrolledCalendarEvents, calendarEvents } = useAuthStore();
    const { allCourses, listMyCourses } = useTeacherStore();
    const { availableQuizzes, myGrades, fetchAvailableQuizzes, listMyGrades, startAttempt, attemptError } = useQuizStore();
    
    // Role-based path prefix
    const rolePrefix = role === "teacher" ? "/teacher" : "/student";
    
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCourses: 0,
        totalQuizzes: 0,
        completedQuizzes: 0,
        averageScore: 0,
        totalNotes: 0,
        enrollmentCount: 0,
    });
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [totalSubmissions, setTotalSubmissions] = useState(0);
    const [startingQuizId, setStartingQuizId] = useState(null);

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        
        const loadData = async () => {
            setIsLoading(true);
            
            // Base promises for both roles
            const promises = [listMyCourses()];
            
            // Student-only endpoints
            if (role === "student") {
                promises.push(fetchAvailableQuizzes(), listMyGrades());
            }
            
            // Teacher-only: fetch recent submissions in parallel
            if (role === "teacher") {
                promises.push(
                    (async () => {
                        try {
                            const subRes = await axios.get("/api/attempts/recent/teacher", {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            setRecentSubmissions(subRes.data.submissions || []);
                            setTotalSubmissions(subRes.data.totalCount || 0);
                        } catch { /* Silent */ }
                    })()
                );
            }
            
            await Promise.all(promises);
            
            // Fetch calendar events for students after courses load
            if (role === "student") {
                const courses = useTeacherStore.getState().allCourses;
                if (courses.length > 0) {
                    const courseIds = courses.map((c) => c._id || c.id).filter(Boolean);
                    if (courseIds.length > 0) {
                        await listEnrolledCalendarEvents(courseIds);
                    }
                }
            }
            
            setIsLoading(false);
        };
        
        loadData();
    }, [token, role, navigate, listMyCourses, fetchAvailableQuizzes, listMyGrades, listEnrolledCalendarEvents]);

     
    useEffect(() => {
        // Calculate stats based on role
        let totalStudents = 0;
        let avgScore = 0;
        let teacherSubmissions = 0;
        
        if (role === "student") {
            const completed = myGrades.filter((g) => g.status === "graded" || g.status === "late");
            avgScore = completed.length > 0
                ? Math.round(completed.reduce((sum, g) => sum + (g.score || 0), 0) / completed.length)
                : 0;
            teacherSubmissions = completed.length;
        } else {
            // Teacher: calculate total students across all courses
            totalStudents = allCourses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);
            teacherSubmissions = totalSubmissions; // Use state from API
        }

        setStats({
            totalCourses: allCourses.length,
            totalQuizzes: availableQuizzes.length,
            completedQuizzes: role === "student" ? teacherSubmissions : totalSubmissions,
            averageScore: avgScore,
            totalNotes: 0,
            enrollmentCount: totalStudents,
        });
    }, [allCourses, availableQuizzes, myGrades, role, totalSubmissions]);

    const handleStartQuiz = async (quizId) => {
        setStartingQuizId(quizId);
        try {
            const result = await startAttempt(quizId);
            if (result && result.attempt) {
                navigate(`/student/quiz/${result.attempt._id}`);
            } else {
                toast.error(attemptError || "Failed to start quiz");
            }
        } catch (err) {
            toast.error(err.message || "An error occurred while starting the quiz");
        } finally {
            setStartingQuizId(null);
        }
    };

    const upcomingQuizzes = availableQuizzes
        .filter((q) => q.timingStatus === "open" && !q.isAttempted)
        .slice(0, 3);

    const recentGrades = myGrades
        .filter((g) => g.score !== null)
        .slice(0, 5);

    const _isStudent = role === "student";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-brand-200 dark:border-brand-700 border-t-brand-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 space-y-6"
        >
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Welcome back, {user?.name?.split(" ")[0]}!
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {role === "teacher" 
                            ? "Here's your teaching overview for today" 
                            : "Here's your learning overview for today"}
                    </p>
                </div>
                <div className="hidden md:block">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date().toLocaleDateString("en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                </div>
            </div>

            {/* Stats Grid - Role-based */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {role === "teacher" ? (
                    <>
                        <ProgressCard
                            title="Total Students"
                            value={stats.enrollmentCount}
                            icon={Users}
                            color="blue"
                            type="stat"
                        />
                        <ProgressCard
                            title="Active Quizzes"
                            value={stats.totalQuizzes}
                            icon={Zap}
                            color="amber"
                            type="stat"
                        />
                        <ProgressCard
                            title="Courses"
                            value={stats.totalCourses}
                            subtitle="Created"
                            icon={BookOpen}
                            color="brand"
                            type="stat"
                        />
                        <ProgressCard
                            title="Submissions"
                            value={stats.completedQuizzes}
                            subtitle="Total received"
                            icon={ClipboardList}
                            color="green"
                            type="stat"
                        />
                    </>
                ) : (
                    <>
                        <ProgressCard
                            title="My Courses"
                            value={stats.totalCourses}
                            icon={BookOpen}
                            color="brand"
                            type="stat"
                        />
                        <ProgressCard
                            title="Available Quizzes"
                            value={stats.totalQuizzes}
                            icon={Zap}
                            color="blue"
                            type="stat"
                        />
                        <ProgressCard
                            title="Completed"
                            value={stats.completedQuizzes}
                            subtitle={`of ${stats.totalQuizzes + stats.completedQuizzes} total`}
                            icon={FileText}
                            color="green"
                            type="stat"
                        />
                        <ProgressCard
                            title="Average Score"
                            value={`${stats.averageScore}%`}
                            subtitle={stats.completedQuizzes > 0 ? "Great progress!" : "No grades yet"}
                            icon={Award}
                            color={stats.averageScore >= 80 ? "green" : stats.averageScore >= 60 ? "amber" : "red"}
                            type="stat"
                        />
                    </>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Widget */}
                <div className="lg:col-span-2 space-y-6">
                    {role === "teacher" ? (
                        /* Teacher: My Courses */
                        <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                            My Courses
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Your created courses
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate("/teacher/courses")}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                                >
                                    View all
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>

                            {allCourses.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No courses created yet</p>
                                    <p className="text-sm">Create your first course to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {allCourses.slice(0, 4).map((course) => (
                                        <motion.button
                                            key={course._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => navigate(`/teacher/course/${course._id}`)}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center shrink-0">
                                                <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                                    {course.title}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {course.description?.substring(0, 50) || "No description"}...
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                                                    {course.enrollmentCount || 0} students
                                                </span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Student: Upcoming Quizzes */
                        <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                            Upcoming Quizzes
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Ready to take
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`${rolePrefix}/quizzes`)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                                >
                                    View all
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>

                            {upcomingQuizzes.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                    <p className="font-medium">No quizzes available right now</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {upcomingQuizzes.map((quiz) => (
                                        <motion.button
                                            key={quiz._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => handleStartQuiz(quiz._id)}
                                            disabled={startingQuizId === quiz._id}
                                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                                                <Zap className="w-[22px] h-[22px] text-brand-600 dark:text-brand-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                                    {quiz.title}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                                    {quiz.course?.title} • {quiz.durationMinutes} min
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 whitespace-nowrap">
                                                    {startingQuizId === quiz._id ? (
                                                        <span className="loading loading-spinner loading-xs"></span>
                                                    ) : (
                                                        "Show"
                                                    )}
                                                </span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Calendar - Shared */}
                    <CourseCalendar
                        events={[
                            ...availableQuizzes.map((q) => ({
                                ...q,
                                type: "quiz",
                            })),
                            ...(calendarEvents || []).map((e) => ({
                                ...e,
                                type: "calendar-event",
                            })),
                        ]}
                    />
                </div>

                {/* Right Column - Recent Grades & Quick Actions */}
                <div className="space-y-6">
                    {/* Recent Grades (Student) / Recent Submissions (Teacher) */}
                    <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                {role === "teacher" ? (
                                    <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                ) : (
                                    <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {role === "teacher" ? "Recent Submissions" : "Recent Grades"}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {role === "teacher" ? "Student submissions" : "Your latest scores"}
                                </p>
                            </div>
                        </div>

                        {role === "teacher" ? (
                            /* Teacher: Recent Submissions */
                            recentSubmissions.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No submissions yet</p>
                                    <p className="text-sm">Students will appear here after taking quizzes</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentSubmissions.map((sub, index) => (
                                        <motion.div
                                            key={sub.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                                                sub.score >= 80
                                                    ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                                                    : sub.score >= 60
                                                        ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                                        : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                                            }`}>
                                                {sub.score}%
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                                    {sub.studentName}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                    {sub.quizTitle} • {sub.courseTitle}
                                                </p>
                                            </div>
                                            <div className="text-xs text-slate-400 dark:text-slate-500">
                                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString("en-GB") : ""}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )
                        ) : (
                            /* Student: Recent Grades */
                            recentGrades.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No grades yet</p>
                                    <p className="text-sm">Complete a quiz to see your score</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentGrades.map((grade, index) => (
                                        <motion.div
                                            key={grade.attemptId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                                                grade.score >= 80
                                                    ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                                    : grade.score >= 60
                                                        ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                        : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                            }`}>
                                                {grade.score}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                                    {grade.quiz?.title}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {grade.course?.title}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                                                grade.status === "graded"
                                                    ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                                    : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                            }`}>
                                                {grade.status}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            )
                        )}

                        <button
                            onClick={() => navigate(role === "teacher" ? "/teacher/courses" : "/student/grades")}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            {role === "teacher" ? "View all courses" : "View all grades"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Quick Actions - Role-based */}
                    <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {role === "teacher" ? (
                                <>
                                    <button
                                        onClick={() => navigate(`${rolePrefix}/quiz/create`)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <PlusCircle className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Create Quiz
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => navigate("/teacher/courses")}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Courses
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => navigate(`${rolePrefix}/analytics`)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Analytics
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => navigate("/leaderboard")}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Rankings
                                        </span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate(`${rolePrefix}/quizzes`)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Take Quiz
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => navigate(`${rolePrefix}/calendar`)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <Calendar className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Calendar
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => navigate(`${rolePrefix}/analytics`)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Analytics
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => navigate("/leaderboard")}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Rankings
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Course Progress / Course Overview - Role-based */}
                    <div className="bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                {role === "teacher" ? (
                                    <GraduationCap className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                ) : (
                                    <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {role === "teacher" ? "Course Overview" : "Course Progress"}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {role === "teacher" ? "Enrollment across your courses" : "Your learning journey"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {role === "teacher" ? (
                                /* Teacher: Show progress based on published quizzes */
                                allCourses.slice(0, 3).map((course, _index) => {
                                    const publishedCount = course.publishedQuizCount || 0;
                                    const progress = Math.min(publishedCount * 25, 100);
                                    return (
                                        <ProgressCard
                                            key={course._id}
                                            title={course.title}
                                            value={progress}
                                            total={100}
                                            subtitle={`${publishedCount} quiz(s) published`}
                                            icon={BookOpen}
                                            color="brand"
                                            type="compact"
                                        />
                                    );
                                })
                            ) : (
                                /* Student: Show progress based on published quizzes */
                                allCourses.slice(0, 3).map((course, _index) => {
                                    const publishedCount = course.publishedQuizCount || 0;
                                    const progress = Math.min(publishedCount * 25, 100);
                                    return (
                                        <ProgressCard
                                            key={course._id}
                                            title={course.title}
                                            value={progress}
                                            total={100}
                                            subtitle={`${publishedCount} quiz(s) published`}
                                            icon={BookOpen}
                                            color="brand"
                                            type="compact"
                                        />
                                    );
                                })
                            )}
                            {allCourses.length === 0 && (
                                <p className="text-center py-4 text-slate-500 dark:text-slate-400">
                                    No courses yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default DashboardPage;
