import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../../stores/Authstore";
import useThemeStore from "../../stores/ThemeStore";
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
} from "lucide-react";

// Admin links
const adminLinks = [
    { to: "/admin", icon: Shield, label: "Dashboard", id: "dashboard" },
    { to: "/admin/users", icon: Users, label: "Manage Users", id: "users" },
    { to: "/admin/analytics", icon: BarChart3, label: "Analytics", id: "analytics" },
    { to: "/admin/logs", icon: FileText, label: "Activity Logs", id: "logs" },
    { to: "/admin/tickets", icon: MessageSquare, label: "Support Tickets", id: "tickets" },
    { to: "/settings", icon: Settings, label: "Settings", id: "settings" },
];

// Teacher links - "/teacher" now shows rich DashboardPage with widgets
const teacherLinks = [
    { to: "/teacher", icon: Home, label: "Home", id: "home" },
    { to: "/teacher/courses", icon: BookOpen, label: "My Courses", id: "courses" },
    { to: "/teacher/analytics", icon: BarChart3, label: "Analytics", id: "analytics" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard", id: "leaderboard" },
    { to: "/settings", icon: Settings, label: "Settings", id: "settings" },
];

// Student links - "/student" now shows rich DashboardPage with widgets
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

// Glassmorphism styles - dark mode aware
const glassSidebarStyle = (isDark) => ({
    backgroundColor: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.75)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRight: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(255, 255, 255, 0.5)",
    boxShadow: isDark ? "8px 0 32px rgba(0, 0, 0, 0.5)" : "8px 0 32px rgba(0, 0, 0, 0.12)",
});

const glassBackdropStyle = (isDark) => ({
    backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.35)",
    backdropFilter: "blur(8px)",
});

function Sidebar({ isOpen, onClose }) {
    const navigate = useNavigate();
    const { user, role, logout, clearToken, clearUser } = useAuthStore();
    const { theme } = useThemeStore();
    const isDark = theme === "night";

    const links = role === "admin" ? adminLinks : role === "teacher" ? teacherLinks : studentLinks;

    const handleLogout = () => {
        logout();
        clearToken();
        clearUser();
        navigate("/login");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: "fixed",
                            inset: 0,
                            ...glassBackdropStyle(isDark),
                            zIndex: 150,
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, x: "-100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        style={{
                            position: "fixed",
                            left: 0,
                            top: 0,
                            height: "100%",
                            width: "100%",
                            maxWidth: 300,
                            ...glassSidebarStyle(isDark),
                            display: "flex",
                            flexDirection: "column",
                            zIndex: 200,
                        }}
                    >
                        <div style={{
                            height: 90,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <GraduationCap style={{ width: 36, height: 36, color: isDark ? "#a855f7" : "#8b5cf6" }} />
                                <span style={{ fontSize: 24, fontWeight: 700, color: isDark ? "#f1f5f9" : "#1e293b", letterSpacing: "-0.02em" }}>
                                    EduFlow
                                </span>
                            </div>
                        </div>

                        <nav style={{ 
                            flex: 1, 
                            padding: "20px 16px", 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: 6, 
                            overflowY: "auto" 
                        }}>
                            {links.map((link) => (
                                <NavLink
                                    end
                                    key={link.id}
                                    to={link.to}
                                    onClick={onClose}
                                    style={({ isActive }) => ({
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 14,
                                        padding: "14px 18px",
                                        borderRadius: 14,
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: isActive ? "#fff" : (isDark ? "#94a3b8" : "#475569"),
                                        backgroundColor: isActive 
                                            ? "linear-gradient(135deg, #8b5cf6, #9333ea)" 
                                            : "transparent",
                                        textDecoration: "none",
                                        boxShadow: isActive ? "0 4px 16px rgba(139, 92, 246, 0.35)" : "none",
                                        transition: "all 0.2s ease",
                                        border: isActive ? "none" : (isDark ? "1px solid rgba(255, 255, 255, 0.04)" : "1px solid transparent"),
                                    })}
                                >
                                    <link.icon style={{ width: 20, height: 20 }} />
                                    {link.label}
                                </NavLink>
                            ))}
                        </nav>

                        <div style={{
                            padding: "20px 16px",
                            borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
                            background: isDark ? "rgba(139, 92, 246, 0.08)" : "rgba(139, 92, 246, 0.04)",
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "14px 18px",
                                marginBottom: 10,
                                borderRadius: 14,
                                background: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.6)",
                                backdropFilter: "blur(8px)",
                                border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(255, 255, 255, 0.5)",
                            }}>
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: "linear-gradient(135deg, #8b5cf6, #9333ea)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontWeight: 700,
                                    fontSize: 16,
                                }}>
                                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#f1f5f9" : "#1e293b", margin: 0 }}>
                                        {user?.name || "User"}
                                    </p>
                                    <p style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", margin: 0, textTransform: "capitalize" }}>
                                        {user?.role || "Guest"}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    padding: "14px 18px",
                                    borderRadius: 14,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: "#fff",
                                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                    border: "none",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 16px rgba(239, 68, 68, 0.25)",
                                }}
                            >
                                <LogOut style={{ width: 20, height: 20 }} />
                                Logout
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default Sidebar;