import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../../stores/Authstore";
import useUIStore from "../../stores/uiStore";
import {
    Home,
    BookOpen,
    FileText,
    BarChart3,
    Settings,
    LogOut,
    Users,
    Trophy,
    Calendar,
    Zap,
    Shield,
    GraduationCap,
    MessageSquare,
    PlusCircle,
    ClipboardList,
    Pin,
    PinOff,
} from "lucide-react";

// ─── Navigation Links by Role ─────────────────────────────────────
const adminLinks = [
    { to: "/admin", icon: Shield, label: "Dashboard", id: "dashboard" },
    { to: "/admin/users", icon: Users, label: "Manage Users", id: "users" },
    { to: "/admin/analytics", icon: BarChart3, label: "Analytics", id: "analytics" },
    { to: "/admin/logs", icon: FileText, label: "Activity Logs", id: "logs" },
    { to: "/admin/tickets", icon: MessageSquare, label: "Support Tickets", id: "tickets" },
    { to: "/settings", icon: Settings, label: "Settings", id: "settings" },
];

const teacherLinks = [
    { to: "/teacher", icon: Home, label: "Home", id: "home" },
    { to: "/teacher/courses", icon: BookOpen, label: "My Courses", id: "courses" },
    { to: "/teacher/quiz/create", icon: PlusCircle, label: "New Quiz", id: "new-quiz" },
    { to: "/teacher/chats", icon: MessageSquare, label: "Chats", id: "chats" },
    { to: "/teacher/review-requests", icon: ClipboardList, label: "Reviews", id: "reviews" },
    { to: "/teacher/analytics", icon: BarChart3, label: "Analytics", id: "analytics" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard", id: "leaderboard" },
    { to: "/settings", icon: Settings, label: "Settings", id: "settings" },
];

const studentLinks = [
    { to: "/student", icon: Home, label: "Home", id: "home" },
    { to: "/student/courses", icon: BookOpen, label: "My Courses", id: "courses" },
    { to: "/student/quizzes", icon: Zap, label: "Quizzes", id: "quizzes" },
    { to: "/student/grades", icon: FileText, label: "Grades", id: "grades" },
    { to: "/student/calendar", icon: Calendar, label: "Calendar", id: "calendar" },
    { to: "/student/analytics", icon: BarChart3, label: "Analytics", id: "analytics" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard", id: "leaderboard" },
    { to: "/settings", icon: Settings, label: "Settings", id: "settings" },
];

// ─── Animation Variants ───────────────────────────────────────────
const sidebarVariants = {
    hidden: { x: "-100%", opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: { type: "spring", damping: 25, stiffness: 300 },
    },
    exit: {
        x: "-100%",
        opacity: 0,
        transition: { type: "spring", damping: 25, stiffness: 300 },
    },
};

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

// ─── Component ────────────────────────────────────────────────────
function Sidebar({ isOpen, onClose, pinned }) {
    const navigate = useNavigate();
    const { user, role, logout } = useAuthStore();
    const toggleSidebarPin = useUIStore((s) => s.toggleSidebarPin);
    const isPinned = pinned && typeof window !== "undefined" && window.innerWidth >= 1280;

    const links =
        role === "admin" ? adminLinks : role === "teacher" ? teacherLinks : studentLinks;

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // When pinned, render as a persistent column (no AnimatePresence)
    if (isPinned) {
        return (
            <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40 bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl border-r border-white/50 dark:border-white/[0.04] shadow-xl shadow-slate-900/10 dark:shadow-black/40"
                role="navigation" aria-label="Sidebar navigation">
                {/* Logo + Pin */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/50 dark:border-white/[0.04]">
                    <div onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer" role="button" tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/")}>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-700/25">
                            <GraduationCap className="w-[18px] h-[18px] text-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">EduBox</span>
                    </div>
                    <button onClick={toggleSidebarPin}
                        className="p-2.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        aria-label="Unpin sidebar" title="Unpin sidebar">
                        <PinOff className="w-4 h-4" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
                    {links.map((link) => (
                        <NavLink end key={link.id} to={link.to}
                                className={({ isActive }) =>
                                    ["flex items-center gap-3.5 px-5 py-3.5 rounded-xl text-base font-semibold",
                                    "transition-all duration-150 ease-out no-underline",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                                    isActive
                                        ? "bg-gradient-to-r from-brand-700 to-brand-500 text-white shadow-md shadow-brand-700/25"
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 hover:text-slate-700 dark:hover:text-slate-200",
                                ].join(" ")
                            }>
                            <link.icon className="w-5 h-5" />
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User Card & Logout */}
                <div className="p-3 border-t border-slate-200/50 dark:border-white/[0.04] bg-gradient-to-t from-brand-700/[0.04] to-transparent">
                    <div className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-lg border border-white/60 dark:border-white/[0.04]">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-brand-700/25 flex-shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || "User"}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role || "Guest"}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl text-white bg-gradient-to-r from-red-500 to-rose-600 font-semibold text-base shadow-lg shadow-red-500/25 cursor-pointer hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 ease-out border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
                        <LogOut className="w-5 h-5" /> Logout
                    </button>
                </div>
            </aside>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={onClose}
                        className="fixed inset-0 bg-black/35 dark:bg-black/60 backdrop-blur-sm z-50"
                        aria-hidden="true"
                    />

                    {/* Sidebar Panel */}
                    <motion.aside
                        variants={sidebarVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed left-0 top-0 h-full w-full max-w-72 flex flex-col z-[60] bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl border-r border-white/50 dark:border-white/[0.04] shadow-2xl shadow-slate-900/20 dark:shadow-black/50"
                        role="navigation"
                        aria-label="Sidebar navigation"
                    >
                        {/* ── Logo Section ────────────────────────────── */}
                        <div className="h-20 flex items-center justify-between px-5 border-b border-slate-200/50 dark:border-white/[0.04]">
                            <div
                                onClick={() => { navigate("/"); onClose(); }}
                                className="flex items-center gap-3 cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) =>
                                    e.key === "Enter" && (navigate("/"), onClose())
                                }
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-700/25">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    EduBox
                                </span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); toggleSidebarPin(); }}
                                className="p-2.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                aria-label="Pin sidebar" title="Pin sidebar on desktop">
                                <Pin className="w-4 h-4" />
                            </button>
                        </div>

                        {/* ── Navigation Links ────────────────────────── */}
                        <nav className="flex-1 p-4 flex flex-col gap-0.5 overflow-y-auto">
                            {links.map((link) => (
                                <NavLink
                                    end
                                    key={link.id}
                                    to={link.to}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                        [
                                            "flex items-center gap-4 px-5 py-3.5 rounded-xl text-base font-semibold",
                                            "transition-all duration-150 ease-out no-underline",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                                            isActive
                                                ? "bg-gradient-to-r from-brand-700 to-brand-500 text-white shadow-md shadow-brand-700/25"
                                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 hover:text-slate-700 dark:hover:text-slate-200",
                                        ].join(" ")
                                    }
                                >
                                    <link.icon className="w-5 h-5" />
                                    {link.label}
                                </NavLink>
                            ))}
                        </nav>

                        {/* ── User Card & Logout ──────────────────────── */}
                        <div className="p-4 border-t border-slate-200/50 dark:border-white/[0.04] bg-gradient-to-t from-brand-700/[0.04] to-transparent">
                            {/* User Info Card */}
                            <div className="flex items-center gap-3.5 p-3.5 mb-3 rounded-xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-lg border border-white/60 dark:border-white/[0.04]">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-brand-700/25 flex-shrink-0">
                                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        {user?.name || "User"}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                        {user?.role || "Guest"}
                                    </p>
                                </div>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-3.5 px-5 py-3.5 rounded-xl text-white bg-gradient-to-r from-red-500 to-rose-600 font-semibold text-base shadow-lg shadow-red-500/25 cursor-pointer hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 border-none"
                            >
                                <LogOut className="w-5 h-5" />
                                Logout
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

export default Sidebar;
