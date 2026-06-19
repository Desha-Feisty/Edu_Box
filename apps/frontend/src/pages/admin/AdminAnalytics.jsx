import { useState, useEffect, useRef, Suspense } from "react";
import axios from "axios";
import useAuthStore from "../../stores/Authstore";
import { useAdmin } from "../../contexts/AdminContext";
import { Users, BookOpen, FileText, Target, TrendingUp, Award, Clock } from "lucide-react";

// Import chart components (wrapper is small, Recharts is lazy loaded internally)
import { ActivityLineChart, ChartSkeleton } from "../../components/admin/AdminCharts";
import { SkeletonCard, SkeletonTable } from "../../components/common/Skeleton";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function AdminAnalytics() {
    const { token } = useAuthStore();
    
    // Use shared context for enhancedStats (eliminates duplicate fetch)
    const { enhancedStats: contextEnhancedStats } = useAdmin();

    // Client-side cache using useRef
    const cacheRef = useRef({
        analytics: null,
        activity: null,
        teachers: null,
        timestamp: 0
    });
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // State for fetched data - enhancedStats now comes from context
    const [courseAnalytics, setCourseAnalytics] = useState([]);
    const [activityData, setActivityData] = useState(null);
    const [teacherStats, setTeacherStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cacheVersion, setCacheVersion] = useState(0); // Must be before refetch function
    
    // Use enhancedStats from context (shared, no duplicate fetch)
    const enhancedStats = contextEnhancedStats;

    // Fetch data with client-side caching
    useEffect(() => {
        if (!token) return;

        const now = Date.now();
        const cache = cacheRef.current;
        
        // Check if cache is valid (less than 5 minutes old)
        const isCacheValid = (now - cache.timestamp) < CACHE_TTL;

        // Use cached data if available
        if (isCacheValid && cache.analytics && cache.activity && cache.teachers) {
            setCourseAnalytics(cache.analytics);
            setActivityData(cache.activity);
            setTeacherStats(cache.teachers);
            setIsLoading(false);
            return;
        }

        // Fetch from API - enhancedStats now comes from context, only fetch remaining 3
        setIsLoading(true);
        Promise.all([
            axios.get("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } }),
            axios.get("/api/admin/activity?days=7", { headers: { Authorization: `Bearer ${token}` } }),
            axios.get("/api/admin/teachers", { headers: { Authorization: `Bearer ${token}` } })
        ]).then(([analyticsRes, activityRes, teacherRes]) => {
            const analyticsData = analyticsRes.data.courseAnalytics || [];
            const activityResData = activityRes.data || null;
            const teachersData = teacherRes.data.teachers || [];

            cacheRef.current = {
                analytics: analyticsData,
                activity: activityResData,
                teachers: teachersData,
                timestamp: now
            };

            setCourseAnalytics(analyticsData);
            setActivityData(activityResData);
            setTeacherStats(teachersData);
        }).catch((err) => {
            console.error("Failed to fetch admin analytics:", err);
        }).finally(() => setIsLoading(false));
    }, [token, cacheVersion]);

    // Manual refetch - clears cache and re-fetches (fixes duplicate call bug)
    const _refetch = () => {
        cacheRef.current = {
            analytics: null,
            activity: null,
            teachers: null,
            timestamp: 0
        };
        // Force useEffect to re-run by toggling a version state
        setCacheVersion(v => v + 1);
    };

    // Prepare activity chart data
    const activityChartData = activityData?.dailyAttempts?.map(item => ({
        date: new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        attempts: item.count
    })) || [];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
                <SkeletonTable rows={5} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Enhanced Overview Stats */}
            {enhancedStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-base-200 rounded-3xl p-5 shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{enhancedStats.totalStudents}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Students</p>
                    </div>

                    <div className="bg-white dark:bg-base-200 rounded-3xl p-5 shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{enhancedStats.totalTeachers}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Teachers</p>
                    </div>

                    <div className="bg-white dark:bg-base-200 rounded-3xl p-5 shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{enhancedStats.totalCourses}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Courses</p>
                    </div>

                    <div className="bg-white dark:bg-base-200 rounded-3xl p-5 shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{enhancedStats.avgPlatformScore}%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Avg Score</p>
                    </div>
                </div>
            )}

            {/* Activity Chart - Lazy loaded */}
            {activityChartData.length > 0 && (
                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Activity (Last 7 Days)
                    </h3>
                    <div className="h-64 min-h-[256px]">
                        <Suspense fallback={<ChartSkeleton height={256} />}>
                            <ActivityLineChart data={activityChartData} dataKey="attempts" xKey="date" />
                        </Suspense>
                    </div>
                    {activityData && (
                        <div className="mt-4 flex gap-6 text-sm">
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">Total Attempts: </span>
                                <span className="font-bold text-slate-900 dark:text-white">{activityData.totalAttempts}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">Daily Average: </span>
                                <span className="font-bold text-slate-900 dark:text-white">{activityData.averageDaily}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Teacher Performance Table */}
            {teacherStats.length > 0 && (
                <div className="bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-brand-500" />
                        Teacher Performance
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Teacher</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Courses</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Students</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Quizzes</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Avg Score</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Active Students</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teacherStats.slice(0, 10).map((teacher, index) => (
                                    <tr key={teacher.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                {index < 3 && <Award className={`w-4 h-4 ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-amber-700'}`} />}
                                                <span className="font-medium text-slate-900 dark:text-white">{teacher.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{teacher.courseCount}</td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{teacher.studentCount}</td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{teacher.quizCount}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
                                                teacher.avgScore >= 80
                                                    ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                                    : teacher.avgScore >= 60
                                                        ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                        : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                            }`}>
                                                {teacher.avgScore}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{teacher.activeStudents}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Course Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courseAnalytics.map((course) => (
                    <div key={course.id} className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden group hover:scale-[1.01] transition-all">
                        <div className="h-2 bg-gradient-to-r from-brand-500 via-brand-600 to-accent-500"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{course.title}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                        <Users className="w-3.5 h-3.5" />
                                        {course.teacher}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{course.avgScore}%</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Score</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-5 mt-4">
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Students</div>
                                    <div className="font-bold text-slate-900 dark:text-white">{course.studentCount}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Quizzes</div>
                                    <div className="font-bold text-slate-900 dark:text-white">{course.quizCount}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Attempts</div>
                                    <div className="font-bold text-slate-900 dark:text-white">{course.participation}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AdminAnalytics;