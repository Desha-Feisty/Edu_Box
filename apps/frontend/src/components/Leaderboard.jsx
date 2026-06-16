import { useEffect, useState } from "react";
import axios from "axios";
import useAuthStore from "../stores/Authstore";
import { Trophy, Medal, Crown, User, Star } from "lucide-react";

function Leaderboard({ courseId, isTeacher = false }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token, user } = useAuthStore();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`/api/leaderboard/course/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLeaderboard(response.data.leaderboard || []);
            } catch (err) {
                console.error("Failed to fetch leaderboard:", err);
                setError(err.response?.data?.error || "Failed to load rankings. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        if (courseId && token) {
            fetchLeaderboard();
        }
    }, [courseId, token]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06]">
                <span className="loading loading-spinner text-yellow-500 mb-4 loading-lg"></span>
                <p className="text-sm font-medium text-slate-500 animate-pulse">Calculating rankings...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-base-200 rounded-2xl border border-red-200/50 dark:border-red-900/30">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <Star className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="btn btn-outline btn-sm rounded-xl px-6"
                >
                    Try Refreshing
                </button>
            </div>
        );
    }

    if (leaderboard.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-base-200 rounded-2xl border border-dashed border-slate-200/60 dark:border-white/[0.06]">
                <Medal className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No scores recorded yet. Be the first to top the board!</p>
            </div>
        );
    }

    const topThree = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-12 pb-6 px-4 max-w-4xl mx-auto">
                {/* 2nd Place */}
                {topThree[1] && (
                    <div className="order-2 md:order-1 flex flex-col items-center group">
                        <div className="relative mb-3">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-300 dark:border-slate-600 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ring-4 ring-slate-400/10">
                                <span className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                                    {topThree[1].fullName?.charAt(0) || "?"}
                                </span>
                                <div className="absolute -top-1 -right-1 bg-slate-400 text-white rounded-full p-1.5 shadow-lg border-2 border-white dark:border-slate-900">
                                    <Medal className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                        <div className="text-center mb-2">
                            <p className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{topThree[1].fullName}</p>
                        </div>
                        <div className="w-full h-24 relative overflow-hidden bg-gradient-to-b from-slate-100/80 to-slate-200/40 dark:from-slate-800/80 dark:to-slate-900/40 backdrop-blur-sm rounded-t-2xl border-x border-t border-slate-300 dark:border-slate-700 shadow-lg group-hover:-translate-y-2 group-hover:shadow-xl transition-all duration-300">
                            <span className="absolute -bottom-2 -right-2 text-8xl font-black text-slate-300/30 dark:text-slate-700/20 select-none pointer-events-none italic">2</span>
                            <div className="relative z-10 flex flex-col items-center justify-center h-full p-2">
                                <span className="text-2xl font-black text-slate-700 dark:text-slate-200">{topThree[1].averageScore}%</span>
                                <div className="h-0.5 w-8 bg-slate-400/30 my-1 rounded-full"></div>
                                <span className="text-[10px] uppercase tracking-tighter text-slate-500 dark:text-slate-400 font-bold">Average Score</span>
                                <div className="mt-1 px-2 py-0.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-300/30 dark:border-slate-600/30">
                                    {topThree[1].quizzesAttempted} Quizzes
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                    <div className="order-1 md:order-2 flex flex-col items-center group -mt-8">
                        <div className="relative mb-4">
                            <Crown className="absolute -top-12 left-1/2 -translate-x-1/2 w-12 h-12 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-bounce duration-[2000ms]" />
                            <div className="w-28 h-28 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center border-4 border-yellow-500 shadow-2xl shadow-yellow-500/30 group-hover:scale-110 transition-all duration-300 ring-8 ring-yellow-500/10">
                                <span className="text-3xl font-black text-yellow-600 dark:text-yellow-400">
                                    {topThree[0].fullName?.charAt(0) || "?"}
                                </span>
                                <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-2 shadow-lg border-2 border-white dark:border-slate-900">
                                    <Trophy className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                        <div className="text-center mb-3">
                            <p className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[150px]">{topThree[0].fullName}</p>
                        </div>
                        <div className="w-full h-36 relative overflow-hidden bg-gradient-to-b from-yellow-100/90 to-yellow-50/40 dark:from-yellow-900/40 dark:to-yellow-900/10 backdrop-blur-md rounded-t-2xl border-x border-t border-yellow-400 dark:border-yellow-700/50 shadow-2xl group-hover:-translate-y-3 group-hover:shadow-yellow-500/20 transition-all duration-300">
                            <span className="absolute -bottom-4 -right-2 text-9xl font-black text-yellow-400/20 dark:text-yellow-700/10 select-none pointer-events-none italic">1</span>
                            <div className="relative z-10 flex flex-col items-center justify-center h-full p-3">
                                <span className="text-4xl font-black text-yellow-600 dark:text-yellow-400 drop-shadow-sm">{topThree[0].averageScore}%</span>
                                <div className="h-1 w-12 bg-yellow-400/40 my-2 rounded-full"></div>
                                <span className="text-[11px] uppercase tracking-tighter text-yellow-700 dark:text-yellow-400/80 font-black">Top Score</span>
                                <div className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded-full text-[11px] font-black shadow-md border border-white/20">
                                    {topThree[0].quizzesAttempted} Quizzes Solved
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                    <div className="order-3 flex flex-col items-center group">
                        <div className="relative mb-3">
                            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center border-4 border-amber-600 dark:border-amber-700 shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-4 ring-amber-600/10">
                                <span className="text-xl font-bold text-amber-700 dark:text-amber-500">
                                    {topThree[2].fullName?.charAt(0) || "?"}
                                </span>
                                <div className="absolute -top-1 -right-1 bg-amber-600 text-white rounded-full p-1 shadow-lg border-2 border-white dark:border-slate-900">
                                    <Star className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </div>
                        <div className="text-center mb-2">
                            <p className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{topThree[2].fullName}</p>
                        </div>
                        <div className="w-full h-20 relative overflow-hidden bg-gradient-to-b from-amber-100/80 to-amber-50/40 dark:from-amber-900/30 dark:to-amber-900/5 backdrop-blur-sm rounded-t-2xl border-x border-t border-amber-300 dark:border-amber-800/30 shadow-md group-hover:-translate-y-1 group-hover:shadow-lg transition-all duration-300">
                            <span className="absolute -bottom-2 -right-2 text-7xl font-black text-amber-300/30 dark:text-amber-700/20 select-none pointer-events-none italic">3</span>
                            <div className="relative z-10 flex flex-col items-center justify-center h-full p-2">
                                <span className="text-xl font-black text-amber-800 dark:text-amber-400">{topThree[2].averageScore}%</span>
                                <div className="h-0.5 w-6 bg-amber-400/30 my-1 rounded-full"></div>
                                <span className="text-[10px] uppercase tracking-tighter text-amber-700 dark:text-amber-500 font-bold">Avg Score</span>
                                <div className="mt-1 px-2 py-0.5 bg-amber-200/50 dark:bg-amber-800/30 rounded-full text-[9px] font-bold text-amber-800 dark:text-amber-400 border border-amber-300/30">
                                    {topThree[2].quizzesAttempted} Quizzes
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* Rest of the leaderboard */}
            {rest.length > 0 && (
                <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rest.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between p-4 px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-slate-400 w-6">#{index + 4}</span>
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                        {entry.fullName?.charAt(0) || "?"}
                                    </div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {entry.fullName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-sm text-slate-400">Average Score</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{entry.averageScore}%</p>
                                    </div>
                                    <div className="text-right w-24">
                                        <p className="text-sm text-slate-400">Quizzes Solved</p>
                                        <p className="font-bold text-slate-900 dark:text-white">{entry.quizzesAttempted}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* User's own position if not in top list (Optional Enhancement) */}
            {!isTeacher && !leaderboard.find(e => e.fullName === user?.name) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 text-center">
                    <p className="text-blue-700 dark:text-blue-300 text-sm">You haven't earned any points yet. Take a quiz to join the leaderboard!</p>
                </div>
            )}
        </div>
    );
}

export default Leaderboard;
