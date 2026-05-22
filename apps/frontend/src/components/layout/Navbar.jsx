import { LogOut, BookMarked, Bell, Check, ExternalLink, Inbox, Shield, Menu, GraduationCap, X, Sun, Moon, Search } from "lucide-react";
import useAuthStore from "../../stores/Authstore";
import useSocketStore from "../../stores/SocketStore";
import useNotificationStore from "../../stores/NotificationStore";
import useThemeStore from "../../stores/ThemeStore";
import GlobalSearch from "../search/GlobalSearch";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useDebounce } from "../../hooks/useDebounce";

export default function Navbar({ onToggleSidebar, isSidebarOpen, onOpenNotifications }) {
    const { user, logout } = useAuthStore();
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
    const { theme, toggleTheme } = useThemeStore();
    const isDark = theme === "night";
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const searchQuery = useDebounce(searchInput, 200);
    const searchRef = useRef(null);

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

    // Glassmorphism styles - dark mode aware
    const glassStyle = {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: isDark ? "0 8px 32px rgba(0, 0, 0, 0.4)" : "0 8px 32px rgba(0, 0, 0, 0.08)",
    };

    return (
        <>
            <nav
                style={{
                    height: 72,
                    width: "100%",
                    ...glassStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 24px",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                }}
            >
                {/* Left: Menu + Logo */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "0 0 auto" }}>
                    {/* Menu toggle */}
                    <button
                        onClick={onToggleSidebar}
                        style={{
                            padding: 10,
                            borderRadius: 12,
                            background: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.5)",
                            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
                            cursor: "pointer",
                            display: "flex",
                            backdropFilter: "blur(8px)",
                        }}
                    >
                        {isSidebarOpen ? (
                            <X style={{ width: 22, height: 22, color: isDark ? "#94a3b8" : "#64748b" }} />
                        ) : (
                            <Menu style={{ width: 22, height: 22, color: isDark ? "#94a3b8" : "#64748b" }} />
                        )}
                    </button>

                    {/* Logo */}
                    <div
                        onClick={() => navigate("/")}
                        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                    >
                        <div
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 14,
                                background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 4px 16px rgba(139, 92, 246, 0.35)",
                            }}
                        >
                            <GraduationCap style={{ width: 24, height: 24, color: "white" }} />
                        </div>
                        <span
                            style={{
                                fontSize: 22,
                                fontWeight: 700,
                                color: isDark ? "#f1f5f9" : "#1e293b",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            ClassBox
                        </span>
                    </div>
                </div>

                {/* Center: Search Bar */}
                <div style={{ flex: "1 1 auto", display: "flex", justifyContent: "center", maxWidth: 480, margin: "0 24px" }}>
                    <div style={{ position: "relative", width: "100%" }}>
                        <Search 
                            style={{ 
                                position: "absolute", 
                                left: 14, 
                                top: "50%", 
                                transform: "translateY(-50%)", 
                                width: 18, 
                                height: 18, 
                                color: isDark ? "#94a3b8" : "#64748b",
                                pointerEvents: "none"
                            }} 
                        />
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
                            style={{
                                width: "100%",
                                padding: "10px 16px 10px 42px",
                                borderRadius: 14,
                                background: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.5)",
                                backdropFilter: "blur(8px)",
                                border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
                                outline: "none",
                                fontSize: 14,
                                color: isDark ? "#f1f5f9" : "#1e293b",
                                caretColor: "#8b5cf6",
                            }}
                            title="Search (Cmd/Ctrl + K)"
                        />
                    </div>
                </div>

                {/* Right: Icons */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>

                    {/* Notifications bell - glass style */}
                    <button
                        onClick={onOpenNotifications}
                        style={{
                            position: "relative",
                            padding: 12,
                            borderRadius: 14,
                            background: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.5)",
                            backdropFilter: "blur(8px)",
                            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
                            cursor: "pointer",
                        }}
                    >
                        <Bell
                            style={{
                                width: 22,
                                height: 22,
                                color:
                                    unreadCount > 0
                                        ? isDark
                                            ? "#c084fc"
                                            : "#8b5cf6"
                                        : isDark
                                          ? "#94a3b8"
                                          : "#64748b",
                            }}
                        />
                        {unreadCount > 0 && (
                            <span
                                style={{
                                    position: "absolute",
                                    top: 6,
                                    right: 6,
                                    width: 10,
                                    height: 10,
                                    backgroundColor: "#ef4444",
                                    borderRadius: "50%",
                                    border: "2px solid rgba(255,255,255,0.8)",
                                }}
                            />
                        )}
                    </button>

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            padding: 12,
                            borderRadius: 14,
                            background: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.5)",
                            backdropFilter: "blur(8px)",
                            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
                            cursor: "pointer",
                        }}
                        title={theme === "winter" ? "Switch to dark mode" : "Switch to light mode"}
                    >
                        {theme === "winter" ? (
                            <Moon style={{ width: 22, height: 22, color: isDark ? "#94a3b8" : "#64748b" }} />
                        ) : (
                            <Sun style={{ width: 22, height: 22, color: isDark ? "#fbbf24" : "#f59e0b" }} />
                        )}
                    </button>

                    {/* Divider */}
                    <div
                        style={{
                            width: 1,
                            height: 40,
                            backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                        }}
                    />

                    {/* User info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ textAlign: "right" }}>
                            <p
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: isDark ? "#f1f5f9" : "#1e293b",
                                    margin: 0,
                                }}
                            >
                                {user?.name || "User"}
                            </p>
                            <p
                                style={{
                                    fontSize: 12,
                                    color: isDark ? "#94a3b8" : "#64748b",
                                    margin: 0,
                                    textTransform: "capitalize",
                                }}
                            >
                                {user?.role || "Guest"}
                            </p>
                        </div>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: 600,
                                fontSize: 16,
                                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.35)",
                            }}
                        >
                            {user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                padding: 10,
                                borderRadius: 12,
                                background: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(254, 226, 226, 0.5)",
                                border: isDark ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(254, 226, 226, 0.5)",
                                cursor: "pointer",
                                color: isDark ? "#f87171" : "#dc2626",
                            }}
                        >
                            <LogOut style={{ width: 20, height: 20 }} />
                        </button>
                    </div>
                </div>
            </nav>

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