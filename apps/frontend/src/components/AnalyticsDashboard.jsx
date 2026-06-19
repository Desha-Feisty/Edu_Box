import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend,
    Cell,
} from "recharts";
import axios from "axios";
import useAuthStore from "../stores/Authstore";
import { TrendingUp, Users, Zap, Award } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color || entry.fill }}>
                        {entry.name}: <span className="font-bold">{entry.value}%</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

function AnalyticsDashboard({ courseId, mode = "student" }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const endpoint = mode === "teacher" 
                    ? `/api/analytics/course/${courseId}` 
                    : `/api/analytics/student/course/${courseId}`;
                
                const response = await axios.get(endpoint, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(response.data);
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
                // toast.error("Could not load analytics");
            } finally {
                setLoading(false);
            }
        };

        if (courseId && token) {
            fetchData();
        }
    }, [courseId, mode, token]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-base-200 rounded-2xl border border-dashed border-slate-200/60 dark:border-white/[0.06]">
                <span className="loading loading-spinner text-brand-600 mb-4"></span>
                <p className="text-sm text-slate-500">Preparing your analytics...</p>
            </div>
        );
    }

    if (!data || (mode === "teacher" && !data.quizStats?.length) || (mode === "student" && !data.history?.length)) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-base-200 rounded-2xl border border-dashed border-slate-200/60 dark:border-white/[0.06]">
                <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Not enough data to display analytics yet.</p>
            </div>
        );
    }

    // KPI-only lightweight mode for dashboard cards
    if (mode === 'kpi-only') {
        if (!data || (!data.students && !data.quizStats?.length && !data.quizzes && !data.avgScore && !data.history?.length)) {
            return (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-base-200 rounded-2xl border border-dashed border-slate-200/60 dark:border-white/[0.06]">
                    <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">Not enough data to display analytics yet.</p>
                </div>
            );
        }
        return (
            <div className="bg-white dark:bg-base-200 rounded-2xl p-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                        <div className="text-sm text-slate-500">Students</div>
                        <div className="text-xl font-semibold">{data?.students || data?.quizStats?.length || 0}</div>
                    </div>
                    <div className="col-span-1">
                        <div className="text-sm text-slate-500">Avg Score</div>
                        <div className="text-xl font-semibold">{data?.avgScore || Math.round((data?.quizStats?.reduce((s, q) => s + (q.avgScore || 0), 0) || 0) / Math.max(1, (data?.quizStats?.length || 1))) }%</div>
                    </div>
                    <div className="col-span-1">
                        <div className="text-sm text-slate-500">Quizzes</div>
                        <div className="text-xl font-semibold">{data?.quizzes || data?.quizStats?.length || (data?.history?.length || 0)}</div>
                    </div>
                </div>
            </div>
        );
    }

    return ( mode === "teacher" ? (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-6 flex items-center justify-between border-brand-500/10 dark:border-brand-500/20">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Participation</p>
                        <p className="text-3xl font-bold text-brand-600">
                            {Math.round(data.quizStats.reduce((s, q) => s + q.participation, 0) / data.quizStats.length)}%
                        </p>
                    </div>
                    <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-2xl">
                        <Users className="w-6 h-6 text-brand-600" />
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center justify-between border-emerald-500/10 dark:border-emerald-500/20">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Score</p>
                        <p className="text-3xl font-bold text-emerald-600">
                            {Math.round(data.quizStats.reduce((s, q) => s + q.avgScore, 0) / data.quizStats.length)}%
                        </p>
                    </div>
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                        <Award className="w-6 h-6 text-emerald-600" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-500" />
                    Quiz Performance Trends
                </h3>
                <div className="h-80 min-h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={data.quizStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="title" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: "#64748b", fontSize: 12 }} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: "#64748b", fontSize: 12 }}
                                domain={[0, 100]}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar 
                                name="Average Score" 
                                dataKey="avgScore" 
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                            >
                                {data.quizStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                            <Bar 
                                name="Participation" 
                                dataKey="participation" 
                                fill="#94a3b8"
                                radius={[6, 6, 0, 0]}
                                barSize={20}
                                opacity={0.6}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    ) : (
        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-500" />
                My Learning Progress
            </h3>
            <div className="h-64 min-h-[256px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={data.history} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="quizTitle" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: "#64748b", fontSize: 11 }} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            domain={[0, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                            type="monotone" 
                            dataKey="score" 
                            name="Score"
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4, stroke: "#fff" }}
                            activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl text-blue-700 dark:text-blue-400">
                    <span className="text-xs font-bold uppercase">Average Score:</span>
                    <span className="text-xl font-bold">
                        {Math.round(data.history.reduce((s, h) => s + h.score, 0) / data.history.length)}%
                    </span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl text-emerald-700 dark:text-emerald-400">
                    <span className="text-xs font-bold uppercase">Quizzes Taken:</span>
                    <span className="text-xl font-bold">{data.history.length}</span>
                </div>
            </div>
        </div>
    ));
}

export default AnalyticsDashboard;
