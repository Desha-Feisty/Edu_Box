import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import useAuthStore from "../stores/Authstore";
import useQuizStore from "../stores/Quizstore";
import useTeacherStore from "../stores/Teacherstore";
import PageWrapper from "../components/layout/PageWrapper";
import {
    TrendingUp,
    TrendingDown,
    Clock,
    Target,
    Award,
    Zap,
    BookOpen,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Users,
    GraduationCap,
} from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-base-200 px-4 py-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                        {entry.name === "Score" ? "%" : ""}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

function AnalyticsPage() {
    const navigate = useNavigate();
    const { role, token } = useAuthStore();
    const { myGrades, listMyGrades, fetchAvailableQuizzes } = useQuizStore();
    const { allCourses, listMyCourses } = useTeacherStore();
    
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState("week");

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
            
            await Promise.all(promises);
            setIsLoading(false);
        };
        
        loadData();
    }, [token, role, navigate, listMyCourses, fetchAvailableQuizzes, listMyGrades]);

    // Calculate analytics data
    const analyticsData = useCallback(() => {
        // Teacher analytics - show course performance
        if (role === "teacher") {
            const totalCourses = allCourses.length;
            const totalStudents = allCourses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);
            const totalQuizzes = allCourses.reduce((sum, c) => sum + (c.publishedQuizCount || 0), 0);

            // Course performance data
            const coursePerformance = allCourses.map((course) => ({
                name: course.title?.slice(0, 20) || "Course",
                fullName: course.title,
                students: course.enrollmentCount || 0,
                quizzes: course.publishedQuizCount || 0,
                avgScore: course.avgScore || 0,
            }));

            // Calculate real completion rates (placeholder - would need API data)
            const completionRates = allCourses.map((course) => ({
                course: course.title?.slice(0, 15) || "Course",
                rate: course.enrollmentCount > 0 ? Math.round(50 + Math.random() * 50) : 0, // Placeholder
            }));

            return {
                isTeacher: true,
                totalCourses,
                totalStudents,
                totalQuizzes,
                coursePerformance,
                completionRates,
                avgScore: totalCourses > 0 ? Math.round(coursePerformance.reduce((sum, c) => sum + c.avgScore, 0) / totalCourses) : 0,
            };
        }

        // Student analytics - show quiz performance
        const completed = myGrades.filter((g) => g.status === "graded" || g.status === "late");

        // Overall stats
        const totalAttempts = completed.length;
        const avgScore = totalAttempts > 0
            ? Math.round(completed.reduce((sum, g) => sum + (g.score || 0), 0) / totalAttempts)
            : 0;

        const passingScore = totalAttempts > 0
            ? Math.round((completed.filter((g) => (g.score || 0) >= 60).length / totalAttempts) * 100)
            : 0;

        const perfectScore = totalAttempts > 0
            ? Math.round((completed.filter((g) => (g.score || 0) === 100).length / totalAttempts) * 100)
            : 0;

        // Score distribution
        const scoreRanges = [
            { name: "0-20%", range: [0, 20], count: 0 },
            { name: "21-40%", range: [21, 40], count: 0 },
            { name: "41-60%", range: [41, 60], count: 0 },
            { name: "61-80%", range: [61, 80], count: 0 },
            { name: "81-100%", range: [81, 100], count: 0 },
        ];

        completed.forEach((g) => {
            const score = g.score || 0;
            const rangeIndex = scoreRanges.findIndex((r) => score >= r.range[0] && score <= r.range[1]);
            if (rangeIndex !== -1) {
                scoreRanges[rangeIndex].count++;
            }
        });

        // Real progress data from completed quizzes
        const progressData = completed
            .slice(-6)
            .map((g, idx) => ({
                quiz: g.quiz?.title?.slice(0, 15) || `Quiz ${idx + 1}`,
                score: g.score || 0,
            }));

        // Course performance (real data)
        const coursePerformance = allCourses.map((course) => {
            const courseGrades = completed.filter((g) =>
                g.course?._id === course._id || g.course === course._id
            );
            const avg = courseGrades.length > 0
                ? Math.round(courseGrades.reduce((sum, g) => sum + (g.score || 0), 0) / courseGrades.length)
                : 0;

            return {
                name: course.title?.slice(0, 20) || "Course",
                fullName: course.title,
                quizzes: course.publishedQuizCount || 0,
                average: avg,
            };
        });

        return {
            isTeacher: false,
            totalAttempts,
            avgScore,
            passingScore,
            perfectScore,
            scoreRanges,
            progressData,
            coursePerformance,
            completed,
        };
    }, [myGrades, allCourses, role]);

    const colors = {
        violet: "#8B5CF6",
        blue: "#3B82F6",
        green: "#22C55E",
        amber: "#F59E0B",
        red: "#EF4444",
    };



    if (isLoading) {
        return (
            <PageWrapper>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-10 h-10 border-4 border-violet-200 dark:border-violet-700 border-t-violet-600 rounded-full animate-spin" />
                </div>
            </PageWrapper>
        );
    }

    const data = analyticsData();

    return (
        <PageWrapper>
            <div
                className="max-w-7xl mx-auto px-6 py-8 w-full animate-in fade-in duration-500"
            >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {role === "teacher" ? "Course Analytics" : "Analytics"}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {role === "teacher" ? "Track your courses and student performance" : "Detailed performance insights"}
                    </p>
                </div>

                {/* Time Range Selector - only for students */}
                {role !== "teacher" && (
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl">
                        {["week", "month", "semester"].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    timeRange === range
                                        ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Teacher Analytics View */}
            {data.isTeacher && (
                <div className="space-y-6">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.totalCourses}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Courses</p>
                        </div>

                        <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.totalStudents}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Students</p>
                        </div>

                        <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.totalQuizzes}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Quizzes</p>
                        </div>

                        <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                {data.avgScore >= 70 ? (
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-red-500" />
                                )}
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.avgScore}%</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Avg Score</p>
                        </div>
                    </div>

                    {/* Teacher Analytics Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                                Students per Course
                            </h3>
                            {data.coursePerformance.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <p>No courses yet</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={data.coursePerformance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                                        <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} width={100} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="students" name="Students" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                                Quizzes per Course
                            </h3>
                            {data.coursePerformance.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <p>No courses yet</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={data.coursePerformance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                                        <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} width={100} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="quizzes" name="Quizzes" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Course Performance Table */}
                    <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            Course Performance
                        </h3>

                        {data.coursePerformance.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No courses yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Course</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Students</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Quizzes</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Avg Score</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.coursePerformance.map((course, index) => (
                                            <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="py-3 px-4">
                                                    <p className="font-medium text-slate-900 dark:text-white">{course.fullName}</p>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{course.students}</td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{course.quizzes}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
                                                        course.avgScore >= 80
                                                            ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                                            : course.avgScore >= 60
                                                                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                                : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                                    }`}>
                                                        {course.avgScore}%
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {course.avgScore >= 80 ? (
                                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                            <CheckCircle className="w-4 h-4" /> Excellent
                                                        </span>
                                                    ) : course.avgScore >= 60 ? (
                                                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                            <AlertCircle className="w-4 h-4" /> Good
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                            <XCircle className="w-4 h-4" /> Needs Work
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Student Analytics View */}
            {!data.isTeacher && (
            <div className="space-y-6">

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        {data.avgScore >= 70 ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.avgScore}%</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Average Score</p>
                </div>

                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.totalAttempts}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Attempts</p>
                </div>

                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.passingScore}%</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pass Rate (60%+)</p>
                </div>

                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.perfectScore}%</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Perfect Score Rate</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Progress Over Time */}
                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                        Score Progress
                    </h3>
                    {data.progressData.length === 0 ? (
                        <div className="h-[280px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <p>No quiz attempts yet</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={data.progressData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors.violet} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colors.violet} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="quiz" stroke="#9CA3AF" fontSize={12} />
                                <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    name="Score"
                                    stroke={colors.violet}
                                    fill="url(#colorScore)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Score Distribution */}
                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                        Score Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.scoreRanges}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Attempts" radius={[6, 6, 0, 0]}>
                                {data.scoreRanges.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            index < 2
                                                ? colors.red
                                                : index < 3
                                                    ? colors.amber
                                                    : index < 4
                                                        ? colors.blue
                                                        : colors.green
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Course Performance Chart */}
                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                        Performance by Course
                    </h3>
                    {data.coursePerformance.length === 0 ? (
                        <div className="h-[280px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <p>No course data available</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.coursePerformance} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis type="number" stroke="#9CA3AF" fontSize={12} domain={[0, 100]} />
                                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={120} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="average" name="Avg Score" radius={[0, 6, 6, 0]}>
                                    {data.coursePerformance.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.average >= 80 ? colors.green : entry.average >= 60 ? colors.amber : colors.red}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Course Performance Table */}
            <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Course Performance
                </h3>
                
                {data.coursePerformance.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No course data available</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                        Course
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                        Quizzes
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                        Average
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.coursePerformance.map((course, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                    >
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {course.fullName}
                                            </p>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            {course.quizzes}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
                                                course.average >= 80
                                                    ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                                    : course.average >= 60
                                                        ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                        : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                            }`}>
                                                {course.average}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {course.average >= 80 ? (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Excellent
                                                </span>
                                            ) : course.average >= 60 ? (
                                                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Good
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <XCircle className="w-4 h-4" />
                                                    Needs Work
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Insights */}
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Key Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.avgScore >= 75 && (
                        <div className="flex items-start gap-3 p-4 bg-white dark:bg-base-200 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                    Great Progress
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Your scores are trending upward
                                </p>
                            </div>
                        </div>
                    )}

                    {data.perfectScore >= 10 && (
                        <div className="flex items-start gap-3 p-4 bg-white dark:bg-base-200 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                                <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                    Perfect Scores
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    You've got {Math.round(data.totalAttempts * data.perfectScore / 100)} perfect scores
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-3 p-4 bg-white dark:bg-base-200 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                                Active Learner
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {data.totalAttempts} quizzes completed
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            )}
            </div>
        </PageWrapper>
    );
}

export default AnalyticsPage;