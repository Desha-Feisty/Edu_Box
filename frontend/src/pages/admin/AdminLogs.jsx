import React, { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAdmin } from "../../contexts/AdminContext";
import { 
    Server,
    Clock,
    RefreshCw,
    Download,
    Activity,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Search,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
} from "lucide-react";

function AdminLogs() {
    const context = useOutletContext() || {};
    const { token = "" } = context;
    
    // Use shared admin context for system health
    const { systemHealth, loading: contextLoading } = useAdmin();

    // Client-side cache
    const cacheRef = useRef({
        logs: null,
        stats: null,
        timestamp: 0
    });
    const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

    // Log state
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsTotal, setLogsTotal] = useState(0);
    const [logPage, setLogPage] = useState(1);
    const [logActionFilter, setLogActionFilter] = useState("");
    const [logDateFrom, setLogDateFrom] = useState("");
    const [logDateTo, setLogDateTo] = useState("");
    const [logStats, setLogStats] = useState(null);
    const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
    const [lastLogTimestamp, setLastLogTimestamp] = useState(null);
    const [logSearch, setLogSearch] = useState("");
    const [expandedLogId, setExpandedLogId] = useState(null);

    // Refs for all values accessed inside interval callback
    const autoRefreshRef = useRef(false);
    const lastLogTimestampRef = useRef(null);
    const logPageRef = useRef(1);
    const logActionFilterRef = useRef("");
    const logDateFromRef = useRef("");
    const logDateToRef = useRef("");

    // Sync refs with state
    useEffect(() => { autoRefreshRef.current = autoRefreshLogs; }, [autoRefreshLogs]);
    useEffect(() => { lastLogTimestampRef.current = lastLogTimestamp; }, [lastLogTimestamp]);
    useEffect(() => { logPageRef.current = logPage; }, [logPage]);
    useEffect(() => { logActionFilterRef.current = logActionFilter; }, [logActionFilter]);
    useEffect(() => { logDateFromRef.current = logDateFrom; }, [logDateFrom]);
    useEffect(() => { logDateToRef.current = logDateTo; }, [logDateTo]);

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", logPageRef.current);
            params.append("limit", "20");
            if (logActionFilterRef.current) params.append("action", logActionFilterRef.current);
            if (logDateFromRef.current) params.append("startDate", logDateFromRef.current);
            if (logDateToRef.current) params.append("endDate", logDateToRef.current);
            if (logSearch) params.append("search", logSearch);
            
            const res = await axios.get(`/api/admin/logs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            setLogs(res.data.logs);
            setLogsTotal(res.data.total);
        } catch (err) {
            toast.error("Failed to fetch logs");
        } finally {
            setLogsLoading(false);
        }
    };

    const fetchLogStats = async () => {
        // Check cache first
        const now = Date.now();
        const cache = cacheRef.current;
        
        if (cache.stats && (now - cache.timestamp) < CACHE_TTL) {
            setLogStats(cache.stats);
            return;
        }

        try {
            const res = await axios.get("/api/admin/logs/stats?days=30", { headers: { Authorization: `Bearer ${token}` } });
            cacheRef.current.stats = res.data;
            cacheRef.current.timestamp = now;
            setLogStats(res.data);
        } catch { /* Silent */ }
    };

    // Use system health from context (shared, no duplicate fetch)
    // This is now provided by AdminContext - no local fetch needed

    // Poll for new data
    const pollForNewLogs = useCallback(async () => {
        try {
            const currentToken = token;
            if (!currentToken) return;

            const timestampRes = await axios.get("/api/admin/logs/latest", {
                headers: { Authorization: `Bearer ${currentToken}` },
            });
            const latestTimestamp = timestampRes.data.latestTimestamp;

            if (!latestTimestamp || latestTimestamp === lastLogTimestampRef.current) {
                return;
            }

            setLastLogTimestamp(latestTimestamp);

            const params = new URLSearchParams();
            params.append("page", logPageRef.current);
            params.append("limit", "20");
            if (logActionFilterRef.current) params.append("action", logActionFilterRef.current);
            if (logDateFromRef.current) params.append("startDate", logDateFromRef.current);
            if (logDateToRef.current) params.append("endDate", logDateToRef.current);

            const [logsRes, statsRes] = await Promise.all([
                axios.get(`/api/admin/logs?${params}`, {
                    headers: { Authorization: `Bearer ${currentToken}` },
                }),
                axios.get("/api/admin/logs/stats?days=30", {
                    headers: { Authorization: `Bearer ${currentToken}` },
                }),
            ]);
            setLogs(logsRes.data.logs);
            setLogsTotal(logsRes.data.total);
            setLogStats(statsRes.data);
        } catch { /* Silent */ }
    }, [token]);

    const exportLogs = async () => {
        if (!logDateFrom || !logDateTo) {
            toast.error("Please select date range for export");
            return;
        }
        try {
            const res = await axios.get(`/api/admin/logs/export?startDate=${logDateFrom}&endDate=${logDateTo}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `activity-logs-${logDateFrom}-${logDateTo}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Logs exported successfully");
        } catch {
            toast.error("Failed to export logs");
        }
    };

    // Initial fetch - systemHealth now comes from context
    useEffect(() => {
        fetchLogs();
        fetchLogStats();
        // systemHealth is now provided by AdminContext - no fetch needed
        (async () => {
            try {
                const timestampRes = await axios.get("/api/admin/logs/latest", { headers: { Authorization: `Bearer ${token}` } });
                setLastLogTimestamp(timestampRes.data.latestTimestamp);
            } catch { /* Silent */ }
        })();
    }, [token]);

    // Auto-refresh with Page Visibility API - only poll when tab is visible
    useEffect(() => {
        if (!autoRefreshRef.current) return;

        let intervalId = null;
        let isPageVisible = true;

        const startPolling = () => {
            if (!isPageVisible) return;
            intervalId = setInterval(() => {
                pollForNewLogs();
            }, 30000); // 30 seconds (increased from 5s for better performance)
        };

        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        // Handle page visibility - pause when tab not visible
        const handleVisibilityChange = () => {
            isPageVisible = !document.hidden;
            if (isPageVisible) {
                startPolling();
                // Fetch immediately when tab becomes visible
                pollForNewLogs();
            } else {
                stopPolling();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        
        // Start polling
        startPolling();

        return () => {
            stopPolling();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [autoRefreshLogs, pollForNewLogs]);

    return (
        <div className="space-y-6">
            {/* System Health Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-panel p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Server className="w-5 h-5 text-blue-500" />
                            System Health
                        </h3>
                        <button onClick={() => window.location.reload()} className="btn btn-ghost btn-sm btn-circle">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    {contextLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <span className="loading loading-spinner loading-md text-blue-500"></span>
                        </div>
                    ) : systemHealth ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-xl">
                                <div className="text-xs text-slate-500 mb-1">Status</div>
                                <div className={`font-bold ${systemHealth.health.status === "healthy" ? "text-emerald-500" : "text-amber-500"} flex items-center gap-1`}>
                                    {systemHealth.health.status === "healthy" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {systemHealth.health.status === "healthy" ? "Healthy" : "Warning"}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-xl">
                                <div className="text-xs text-slate-500 mb-1">Uptime</div>
                                <div className="font-bold text-slate-900 dark:text-white">{systemHealth.system.uptime}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-xl">
                                <div className="text-xs text-slate-500 mb-1">Memory (Heap)</div>
                                <div className="font-bold text-slate-900 dark:text-white">{systemHealth.system.memory.heapUsed} / {systemHealth.system.memory.heapTotal}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-xl">
                                <div className="text-xs text-slate-500 mb-1">CPU Load (1m)</div>
                                <div className="font-bold text-slate-900 dark:text-white">{systemHealth.system.cpuLoad["1min"]}</div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500">Loading system health...</p>
                    )}
                </div>
                
                {/* Log Stats */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        Activity (30d)
                    </h3>
                    {logStats ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Total Events</span>
                                <span className="font-bold text-slate-900 dark:text-white">{logStats.totalLogs}</span>
                            </div>
                            {Object.entries(logStats.actionCounts).slice(0, 5).map(([action, count]) => (
                                <div key={action} className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 capitalize">{action.replace(/_/g, " ")}</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">Loading stats...</p>
                    )}
                </div>
            </div>
            
            {/* Filters */}
            <div className="glass-panel p-4">
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search quiz, course, or student..."
                            className="input input-bordered w-full bg-white/50 dark:bg-base-300/50 rounded-xl pl-10"
                            value={logSearch}
                            onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                        />
                    </div>
                    
                    {/* Action Filter */}
                    <div className="min-w-[200px]">
                        <select 
                            className="select select-bordered w-full bg-white/50 dark:bg-base-300/50 rounded-xl"
                            value={logActionFilter}
                            onChange={(e) => { setLogActionFilter(e.target.value); setLogPage(1); }}
                        >
                            <option value="">All Actions</option>
                            <optgroup label="User">
                                <option value="user_login">User Login</option>
                                <option value="user_logout">User Logout</option>
                                <option value="user_created">User Created</option>
                            </optgroup>
                            <optgroup label="Quiz Attempts">
                                <option value="attempt_started">Quiz Attempt Started</option>
                                <option value="quiz_submitted">Quiz Submitted</option>
                                <option value="quiz_submitted_late">Quiz Submitted Late</option>
                                <option value="quiz_auto_submitted">Quiz Auto-Submitted</option>
                                <option value="quiz_auto_submitted_late">Quiz Auto-Submitted Late</option>
                                <option value="quiz_graded">Quiz Graded</option>
                            </optgroup>
                            <optgroup label="Quiz Management">
                                <option value="quiz_created">Quiz Created</option>
                                <option value="quiz_published">Quiz Published</option>
                                <option value="quiz_unpublished">Quiz Unpublished</option>
                                <option value="quiz_deleted">Quiz Deleted</option>
                            </optgroup>
                            <optgroup label="Course">
                                <option value="course_created">Course Created</option>
                                <option value="course_enrolled">Course Enrolled</option>
                                <option value="course_deleted">Course Deleted</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    {/* Quick Filters */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setLogActionFilter("quiz_submitted_late,quiz_auto_submitted_late"); setLogPage(1); }}
                            className="btn btn-sm btn-outline border-amber-500 text-amber-600 dark:text-amber-400 rounded-xl"
                            title="Show late submissions"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Late
                        </button>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                        <input 
                            type="date" 
                            className="input input-bordered bg-white/50 dark:bg-base-300/50 rounded-xl"
                            value={logDateFrom}
                            onChange={(e) => { setLogDateFrom(e.target.value); setLogPage(1); }}
                        />
                        <span className="text-slate-500">to</span>
                        <input 
                            type="date" 
                            className="input input-bordered bg-white/50 dark:bg-base-300/50 rounded-xl"
                            value={logDateTo}
                            onChange={(e) => { setLogDateTo(e.target.value); setLogPage(1); }}
                        />
                    </div>
                    <button 
                        onClick={exportLogs}
                        className="btn btn-outline border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                    <button 
                        onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                        className={`btn rounded-xl ${autoRefreshLogs ? "btn-primary" : "btn-outline border-slate-200 dark:border-slate-700"}`}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${autoRefreshLogs ? "animate-spin" : ""}`} />
                        {autoRefreshLogs ? "Auto-refresh On" : "Auto-refresh Off"}
                    </button>
                </div>
            </div>
            
            {/* Logs Table */}
            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-slate-50 dark:bg-base-300 text-slate-500 uppercase text-[11px] font-black tracking-widest">
                            <tr>
                                <th className="px-4 py-3 w-12"></th>
                                <th className="px-4 py-3">Timestamp</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Action</th>
                                <th className="px-4 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {logsLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center">
                                        <span className="loading loading-spinner loading-md text-blue-500"></span>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                        No activity logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <React.Fragment key={log._id}>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setExpandedLogId(expandedLogId === log._id ? null : log._id)}
                                                    className="btn btn-ghost btn-xs btn-circle"
                                                >
                                                    {expandedLogId === log._id ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {log.createdAt ? new Date(log.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.user ? (
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                            {log.user.name}
                                                        </span>
                                                        <div className="text-xs text-slate-400">{log.user.email}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">System</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`badge badge-sm border-none capitalize ${
                                                    log.action.includes("auto_submitted_late") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                    log.action.includes("submitted_late") ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                    log.action.includes("auto_submitted") ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                                    log.action.includes("attempt_started") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                    log.action.includes("submitted") || log.action.includes("graded") ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                                                    log.action.includes("quiz_created") || log.action.includes("quiz_published") || log.action.includes("quiz_unpublished") || log.action.includes("quiz_deleted") ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                                                    log.action.includes("course_") ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" :
                                                    log.action.includes("user_") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                }`}>
                                                    {log.action.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-md truncate">
                                                {log.details}
                                            </td>
                                        </tr>
                                        {expandedLogId === log._id && (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-4 bg-slate-50 dark:bg-slate-800/50">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        {log.metadata?.quizTitle && (
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Quiz</span>
                                                                <p className="font-medium text-slate-900 dark:text-white">{log.metadata.quizTitle}</p>
                                                            </div>
                                                        )}
                                                        {log.metadata?.courseName && (
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Course</span>
                                                                <p className="font-medium text-slate-900 dark:text-white">{log.metadata.courseName}</p>
                                                            </div>
                                                        )}
                                                        {log.metadata?.score !== undefined && (
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Score</span>
                                                                <p className="font-medium text-slate-900 dark:text-white">
                                                                    {log.metadata.score} / {log.metadata.maxScore} ({log.metadata.percentage}%)
                                                                </p>
                                                            </div>
                                                        )}
                                                        {log.metadata?.isLate !== undefined && (
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Status</span>
                                                                <p className={`font-medium ${log.metadata.isLate ? "text-amber-600" : "text-green-600"}`}>
                                                                    {log.metadata.isLate ? "Late Submission" : "On Time"}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {log.metadata?.attemptId && (
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Attempt ID</span>
                                                                <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{log.metadata.attemptId}</p>
                                                            </div>
                                                        )}
                                                        {log.ipAddress && (
                                                            <div>
                                                                <span className="text-slate-500 text-xs">IP Address</span>
                                                                <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{log.ipAddress}</p>
                                                            </div>
                                                        )}
                                                        {log.userAgent && (
                                                            <div className="col-span-2">
                                                                <span className="text-slate-500 text-xs">User Agent</span>
                                                                <p className="font-mono text-xs text-slate-500 truncate">{log.userAgent}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {logsTotal > 20 && (
                    <div className="flex justify-center items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
                        <button 
                            onClick={() => setLogPage(p => Math.max(1, p - 1))}
                            disabled={logPage === 1}
                            className="btn btn-sm btn-outline"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-500">
                            Page {logPage} of {Math.ceil(logsTotal / 20)}
                        </span>
                        <button 
                            onClick={() => setLogPage(p => p + 1)}
                            disabled={logPage >= Math.ceil(logsTotal / 20)}
                            className="btn btn-sm btn-outline"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminLogs;