import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    LogOut,
    Bell,
    Menu,
    GraduationCap,
    X,
    Sun,
    Moon,
    Search,
} from "lucide-react";
import useAuthStore from "../../stores/Authstore";
import useSocketStore from "../../stores/SocketStore";
import useNotificationStore from "../../stores/NotificationStore";
import useThemeStore from "../../stores/ThemeStore";
import GlobalSearch from "../search/GlobalSearch";
import { useDebounce } from "../../hooks/useDebounce";

export default function Navbar({ onToggleSidebar, isSidebarOpen, onOpenNotifications }) {
    const { user, logout } = useAuthStore();
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
    const { theme, toggleTheme } = useThemeStore();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const searchQuery = useDebounce(searchInput, 200);
    const searchRef = useRef(null);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const disconnectSocket = useSocketStore((state) => state.disconnect);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Keyboard shortcut for search (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                searchRef.current?.focus();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleLogout = () => {
        disconnectSocket();
        logout();
        navigate("/login");
    };

    const iconBtnClass =
        "p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-white/[0.06] backdrop-blur-lg cursor-pointer " +
        "hover:bg-white/80 dark:hover:bg-slate-800/80 hover:border-slate-200/80 dark:hover:border-white/10 " +
        "active:scale-[0.97] " +
        "transition-all duration-150 ease-out " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

    return (
        <>
            <motion.nav
                initial={{ y: -80 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/40 dark:border-white/[0.06] shadow-lg shadow-slate-200/50 dark:shadow-black/20"
            >
                {/* ── Left: Menu + Logo ──────────────────────────────── */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Menu toggle */}
                    <button
                        onClick={onToggleSidebar}
                        className={iconBtnClass}
                        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        {isSidebarOpen ? (
                            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        ) : (
                            <Menu className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        )}
                    </button>

                    {/* Logo */}
                    <div
                        onClick={() => navigate("/")}
                        className="flex items-center gap-3 cursor-pointer select-none"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/")}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-700/25">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            EduBox
                        </span>
                    </div>
                </div>

                {/* ── Center: Search Bar ─────────────────────────────── */}
                <div className="hidden md:flex flex-1 justify-center max-w-md mx-4 lg:mx-6">
                    <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                            placeholder="Search courses, notes, quizzes..."
                            className="w-full pl-10 pr-14 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-white/[0.06] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 backdrop-blur-lg outline-none focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/20 transition-all caret-brand-500"
                            title="Search (Cmd/Ctrl + K)"
                        />
                        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 rounded-md border border-slate-300/50 dark:border-slate-600/50">
                            <span>⌘</span>K
                        </kbd>
                    </div>
                </div>

                {/* ── Mobile search trigger ──────────────────────────── */}
                <button
                    onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                    className={`md:hidden ${iconBtnClass}`}
                    aria-label="Toggle search"
                >
                    <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>

                {/* ── Right: Icons & User ────────────────────────────── */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Notifications */}
                    <button
                        onClick={onOpenNotifications}
                        className={iconBtnClass}
                        aria-label="Open notifications"
                    >
                        <Bell
                            className={`w-5 h-5 transition-colors ${
                                unreadCount > 0
                                    ? "text-brand-500 dark:text-brand-400"
                                    : "text-slate-500 dark:text-slate-400"
                            }`}
                        />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white/80 dark:border-slate-900/80" />
                        )}
                    </button>

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className={iconBtnClass}
                        aria-label={theme === "winter" ? "Switch to dark mode" : "Switch to light mode"}
                    >
                        {theme === "winter" ? (
                            <Moon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        ) : (
                            <Sun className="w-5 h-5 text-amber-400" />
                        )}
                    </button>

                    {/* Divider */}
                    <div className="w-px h-8 bg-slate-300/40 dark:bg-white/[0.06] mx-1 hidden sm:block" />

                    {/* User info — hidden on xs */}
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="text-right hidden lg:block">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                {user?.name || "User"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize leading-tight">
                                {user?.role || "Guest"}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-brand-700/25 flex-shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2.5 rounded-xl bg-red-50/80 dark:bg-red-900/15 border border-red-200/60 dark:border-red-800/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.97] transition-all duration-150 ease-out text-red-500 dark:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                            aria-label="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile: just avatar */}
                    <div className="sm:hidden flex items-center">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center text-white font-semibold text-xs shadow-md shadow-brand-700/25 flex-shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                    </div>
                </div>
            </motion.nav>

            {/* ── Mobile search overlay ──────────────────────────────── */}
            {mobileSearchOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-16 left-0 right-0 z-30 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 md:hidden"
                >
                    <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            autoFocus
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                            placeholder="Search courses, notes, quizzes..."
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                        <button
                            onClick={() => setMobileSearchOpen(false)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            aria-label="Close search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* ── Global Search Modal ────────────────────────────────── */}
            <GlobalSearch
                isOpen={isSearchOpen}
                onClose={() => {
                    setIsSearchOpen(false);
                    setSearchInput("");
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchInput}
                triggerRef={searchRef}
            />
        </>
    );
}
