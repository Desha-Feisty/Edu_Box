import { useState, useEffect, useLayoutEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../../stores/Authstore";
import PageWrapper from "../../components/layout/PageWrapper";
import { useAdmin } from "../../contexts/AdminContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
    Users, 
    BookOpen, 
    TrendingUp,
    Activity,
    FileText,
    Shield,
    BarChart3,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    MessageSquare,
} from "lucide-react";

const tabConfig = [
    { id: "overview", label: "Overview", icon: BarChart3, path: "/admin" },
    { id: "users", label: "Users", icon: Users, path: "/admin/users" },
    { id: "analytics", label: "Analytics", icon: TrendingUp, path: "/admin/analytics" },
    { id: "logs", label: "Logs", icon: FileText, path: "/admin/logs" },
    { id: "tickets", label: "Tickets", icon: MessageSquare, path: "/admin/tickets" },
];

// Path to tab ID mapping
const pathToTabId = {
    "/admin": "overview",
    "/admin/users": "users",
    "/admin/analytics": "analytics",
    "/admin/logs": "logs",
    "/admin/tickets": "tickets",
};

function AdminLayout() {
    const { token } = useAuthStore();
    const { stats, enhancedStats, systemHealth, users, loading: contextLoading, refreshSystemHealth } = useAdmin();
    
    const [_activeTab, setActiveTab] = useState("overview");
    const [_healthLoading, setHealthLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // Mark initialization complete after first render — prevents double loading flash
     
    useLayoutEffect(() => {
        setIsInitializing(false);
    }, []);

    // Sync activeTab from URL
    const location = useLocation();

     
    useEffect(() => {
        const tabId = pathToTabId[location.pathname] || "overview";
        setActiveTab(tabId);
    }, [location.pathname]);

    const fetchSystemHealth = async () => {
        setHealthLoading(true);
        try {
            await refreshSystemHealth();
        } catch {
            toast.error("Failed to fetch system health");
        } finally {
            setHealthLoading(false);
        }
    };

    // Provide shared data via context-like pattern (direct props)
    // Now using context values instead of local state
    const sharedData = {
        stats,
        enhancedStats,
        users,
        setUsers: () => { console.warn("setUsers is a stub - use AdminContext for user management"); },
        systemHealth,
        healthLoading: _healthLoading,
        fetchSystemHealth,
        token,
        loading: contextLoading,
    };

    if (contextLoading && !isInitializing) {
        return (
            <PageWrapper>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <span className="loading loading-spinner loading-lg text-blue-600"></span>
                    <p className="mt-4 text-slate-500 font-medium">Initializing Management Portal...</p>
                </div>
            </PageWrapper>
        );
    }

    // Provide context immediately, even if some values are empty
    return (
        <PageWrapper>
            <main className="max-w-7xl mx-auto px-6 py-8 w-full animate-in fade-in duration-500">
                
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm mb-1 uppercase tracking-wider">
                            <Shield className="w-4 h-4" />
                            Admin Control Portal
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            System Management
                        </h1>
                    </div>
                    <div className="flex gap-2 bg-slate-200/50 dark:bg-base-300/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                        {tabConfig.map(({ id, label, icon: _Icon, path }) => (
                            <NavLink
                                end={path === "/admin"}
                                key={id}
                                to={path}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 ${
                                        isActive
                                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md scale-105"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
                                    }`
                                }
                            >
                                <_Icon className="w-4 h-4" />
                                {label}
                            </NavLink>
                        ))}
                    </div>
                </div>

                {/* Pass shared data to child routes */}
                <Outlet context={sharedData} />
            </main>
        </PageWrapper>
    );
}



// Export shared data for child components
 
export function AdminOverviewContent({ stats, enhancedStats, systemHealth }) {
    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "blue" },
                    { label: "Total Courses", value: stats.totalCourses, icon: BookOpen, color: "emerald" },
                    { label: "Total Quizzes", value: stats.totalQuizzes, icon: Activity, color: "amber" },
                    { label: "Quizzes Solved", value: stats.completedAttempts, icon: BarChart3, color: "purple" },
                ].map((stat, i) => (
                    <div key={i} className={`bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] border-l-4 border-l-${stat.color}-500 p-6 relative overflow-hidden group`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 bg-${stat.color}-500/10 rounded-2xl group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</h3>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Recent Activity / Secondary Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Platform Pulse
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-2xl flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Average Student Performance</span>
                            <span className="font-bold text-emerald-500">
                                {enhancedStats?.avgPlatformScore != null ? `${enhancedStats.avgPlatformScore}%` : "—"}
                            </span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-2xl flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Participation Rate</span>
                            <span className="font-bold text-blue-500">
                                {enhancedStats?.participationRate != null ? `${enhancedStats.participationRate}%` : "—"}
                            </span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-2xl flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">New Signups (30d)</span>
                            <span className="font-bold text-purple-500">
                                {enhancedStats?.newSignupsLast30Days != null ? `+${enhancedStats.newSignupsLast30Days}` : "—"}
                            </span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-2xl flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Logins (30d)</span>
                            <span className="font-bold text-amber-500">
                                {enhancedStats?.loginsLast30Days != null ? `+${enhancedStats.loginsLast30Days}` : "—"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 flex flex-col justify-center items-center text-center space-y-4 bg-gradient-to-br from-brand-600/5 to-brand-800/5">
                    {systemHealth ? (
                        <>
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${systemHealth.health.status === "healthy" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-amber-100 dark:bg-amber-900/40"}`}>
                                {systemHealth.health.status === "healthy" ? (
                                    <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                                )}
                            </div>
                            <h4 className="text-xl font-black">
                                System Status: {systemHealth.health.status === "healthy" ? "Operational" : "Degraded"}
                            </h4>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                                {systemHealth.health.status === "healthy" 
                                    ? `All core services are operational. ${systemHealth.health.errorsLast24h} errors in last 24h.`
                                    : `High error count detected (${systemHealth.health.errorsLast24h} in last 24h). Check logs.`
                                }
                            </p>
                            <div className="w-full mt-4 min-h-[120px]">
                                <ResponsiveContainer width="100%" height={120}>
                                    <LineChart data={systemHealth.activityTrend || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="logs" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                                <Shield className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="text-xl font-black">Loading...</h4>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm">Fetching system status...</p>
                        </>
                    )}
                    <button onClick={() => window.location.href = '/admin/users'} className="btn-brand px-12 mt-4"> Manage Users </button>
                </div>
            </div>
        </div>
    );
}

export default AdminLayout;