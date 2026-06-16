import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import useAuthStore from "../../stores/Authstore";
import useThemeStore from "../../stores/ThemeStore";
import StudentPopover from "./StudentPopover";
import {
    Search,
    X,
    BookOpen,
    FileText,
    ClipboardList,
    Users,
    Ticket,
    ArrowRight,
    User,
} from "lucide-react";

function GlobalSearch({ isOpen, onClose, searchQuery, setSearchQuery, triggerRef }) {
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const { theme } = useThemeStore();
    const isDark = theme === "night";
    const query = searchQuery ?? "";

    const [results, setResults] = useState({ courses: [], notes: [], quizzes: [], users: [], tickets: [], students: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState("all");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [modalPosition, setModalPosition] = useState({ top: 0, left: 0, width: 0 });

    const isAdmin = user?.role === "admin";
    const isTeacher = user?.role === "teacher";

    // Glassmorphism styles - dark mode aware
    const glassStyle = {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: isDark ? "0 8px 32px rgba(0, 0, 0, 0.4)" : "0 8px 32px rgba(0, 0, 0, 0.08)",
    };

    // Glass button styles for hover effects
    const glassButtonStyle = isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.5)";
    const glassBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.5)";

    // Debounced search
     
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2 || !isOpen) {
            setResults({ courses: [], notes: [], quizzes: [], users: [], tickets: [], students: [] });
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const typeParam = activeFilter === "all" ? undefined : activeFilter;
                const res = await axios.get("/api/search", {
                    params: { q: query, type: typeParam },
                    headers: { Authorization: `Bearer ${token}` },
                });
                setResults(res.data);
            } catch {
                // Silent fail for search
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, token, isOpen, activeFilter]);

     
    useEffect(() => {
        if (isOpen) {
            setSelectedIndex(0);
            if (!searchQuery && setSearchQuery) {
                setSearchQuery("");
            }
            setResults({ courses: [], notes: [], quizzes: [], users: [], tickets: [], students: [] });
            setActiveFilter("all");
            setSelectedStudent(null);
            
            // Calculate modal position based on trigger element
            if (triggerRef?.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
                
                setModalPosition({
                    top: rect.bottom + scrollTop + 8,
                    left: rect.left + scrollLeft,
                    width: rect.width
                });
            }
        }
    }, [isOpen, searchQuery, setSearchQuery, triggerRef]);

    // Get all results based on active filter
    const getAllResults = () => {
        if (activeFilter === "all") {
            return [
                ...results.courses.map((r) => ({ ...r, type: "course" })),
                ...results.notes.map((r) => ({ ...r, type: "note" })),
                ...results.quizzes.map((r) => ({ ...r, type: "quiz" })),
                ...(isAdmin ? [
                    ...results.users.map((r) => ({ ...r, type: "user" })),
                    ...results.tickets.map((r) => ({ ...r, type: "ticket" })),
                ] : []),
                ...(isTeacher ? [
                    ...results.students.map((r) => ({ ...r, type: "student" })),
                ] : []),
            ];
        } else if (activeFilter === "courses") {
            return results.courses.map((r) => ({ ...r, type: "course" }));
        } else if (activeFilter === "notes") {
            return results.notes.map((r) => ({ ...r, type: "note" }));
        } else if (activeFilter === "quizzes") {
            return results.quizzes.map((r) => ({ ...r, type: "quiz" }));
        } else if (activeFilter === "users" && isAdmin) {
            return results.users.map((r) => ({ ...r, type: "user" }));
        } else if (activeFilter === "tickets" && isAdmin) {
            return results.tickets.map((r) => ({ ...r, type: "ticket" }));
        } else if (activeFilter === "students" && isTeacher) {
            return results.students.map((r) => ({ ...r, type: "student" }));
        }
        return [];
    };

    const handleSelect = (result) => {
        // If it's a student (teacher only), show the popover instead of navigating
        if (result.type === "student" && isTeacher) {
            setSelectedStudent(result);
            return;
        }

        onClose?.();

        if (result.type === "course") {
            if (isAdmin) {
                navigate(`/admin`);
            } else if (isTeacher) {
                navigate(`/teacher/course/${result._id}`);
            } else {
                navigate(`/student/course/${result._id}`);
            }
        } else if (result.type === "note") {
            navigate(`/note/${result._id}`);
        } else if (result.type === "quiz") {
            if (isAdmin) {
                navigate(`/admin`);
            } else if (isTeacher) {
                navigate(`/teacher/quiz/${result._id}/questions`);
            } else {
                navigate(`/student/quizzes`);
            }
        } else if (result.type === "user" && isAdmin) {
            navigate(`/admin/users`);
        } else if (result.type === "ticket" && isAdmin) {
            navigate(`/admin/tickets`);
        }
    };

    // Filters based on role
    const getFilters = () => {
        const baseFilters = [
            { id: "all", label: "All", icon: Search },
            { id: "courses", label: "Courses", icon: BookOpen },
            { id: "notes", label: "Notes", icon: FileText },
            { id: "quizzes", label: "Quizzes", icon: ClipboardList },
        ];

        if (isAdmin) {
            return [
                ...baseFilters,
                { id: "users", label: "Users", icon: Users },
                { id: "tickets", label: "Tickets", icon: Ticket },
            ];
        }

        if (isTeacher) {
            return [
                ...baseFilters,
                { id: "students", label: "Students", icon: User },
            ];
        }

        return baseFilters;
    };

    const filters = getFilters();
    const allResults = getAllResults();

    // Get icon color based on type
    const getIconColors = (type) => {
        switch (type) {
            case "course":
                return { bg: "bg-blue-100 dark:bg-blue-500/20", icon: "text-blue-600 dark:text-blue-400" };
            case "note":
                return { bg: "bg-amber-100 dark:bg-amber-500/20", icon: "text-amber-600 dark:text-amber-400" };
            case "quiz":
                return { bg: "bg-green-100 dark:bg-green-500/20", icon: "text-green-600 dark:text-green-400" };
            case "user":
                return { bg: "bg-purple-100 dark:bg-purple-500/20", icon: "text-purple-600 dark:text-purple-400" };
            case "ticket":
                return { bg: "bg-rose-100 dark:bg-rose-500/20", icon: "text-rose-600 dark:text-rose-400" };
            case "student":
                return { bg: "bg-indigo-100 dark:bg-indigo-500/20", icon: "text-indigo-600 dark:text-indigo-400" };
            default:
                return { bg: "bg-slate-100 dark:bg-slate-500/20", icon: "text-slate-600 dark:text-slate-400" };
        }
    };

    // Get item icon
    const getItemIcon = (type) => {
        switch (type) {
            case "course": return BookOpen;
            case "note": return FileText;
            case "quiz": return ClipboardList;
            case "user": return Users;
            case "ticket": return Ticket;
            case "student": return User;
            default: return Search;
        }
    };

    // Render result item
    const renderResultItem = (item, index) => {
        const { bg, icon } = getIconColors(item.type);
        const ItemIcon = getItemIcon(item.type);

        return (
            <button
                key={item._id || index}
                onClick={() => handleSelect(item)}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 24px",
                    textAlign: "left",
                    background: selectedIndex === index ? (isDark ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.08)") : "transparent",
                    transition: "all 0.2s",
                    cursor: "pointer",
                    border: "none",
                }}
                onMouseEnter={(e) => {
                    if (selectedIndex !== index) {
                        e.currentTarget.style.background = isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.5)";
                    }
                }}
                onMouseLeave={(e) => {
                    if (selectedIndex !== index) {
                        e.currentTarget.style.background = "transparent";
                    }
                }}
            >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <ItemIcon className={`w-5 h-5 ${icon}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: isDark ? "#f1f5f9" : "#1e293b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title || item.name || item.subject}
                    </p>
                    {item.type === "note" && item.content && (
                        <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.content.slice(0, 60)}...
                        </p>
                    )}
                    {item.type === "course" && item.description && (
                        <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.description}
                        </p>
                    )}
                    {item.type === "quiz" && item.course?.title && (
                        <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
                            {item.course.title} • {item.durationMinutes} min
                        </p>
                    )}
                    {item.type === "user" && (
                        <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
                            {item.email} • <span style={{ textTransform: "capitalize" }}>{item.role}</span>
                        </p>
                    )}
                    {item.type === "ticket" && (
                        <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
                            {item.description?.slice(0, 50)}...
                        </p>
                    )}
                    {item.type === "student" && (
                        <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
                            {item.email}
                        </p>
                    )}
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
            </button>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                            zIndex: 49,
                        }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        style={{
                            ...glassStyle,
                            position: "fixed",
                            top: modalPosition.top + 12,
                            left: modalPosition.left + (modalPosition.width / 2) - 350,
                            width: 700,
                            borderRadius: "1rem",
                            overflow: "hidden",
                            zIndex: 50,
                        }}
                        className=""
                    >
                        {/* Filters */}
                        <div 
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "12px 24px",
                                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.3)",
                                overflowX: "auto",
                            }}
                        >
                            {filters.map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => {
                                        setActiveFilter(filter.id);
                                        setSelectedIndex(0);
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "8px 16px",
                                        borderRadius: 9999,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        ...(activeFilter === filter.id
                                            ? {
                                                  background: "rgba(139, 92, 246, 0.15)",
                                                  color: "#8b5cf6",
                                                  border: "1px solid rgba(139, 92, 246, 0.3)",
                                              }
                                            : {
                                                  background: glassButtonStyle,
                                                  color: isDark ? "#94a3b8" : "#64748b",
                                                  border: `1px solid ${glassBorder}`,
                                              }),
                                    }}
                                >
                                    <filter.icon className="w-4 h-4" />
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        {/* Results */}
                        <div 
                            style={{
                                maxHeight: "24rem",
                                overflowY: "auto",
                            }}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-violet-200 dark:border-violet-700 border-t-violet-600 rounded-full animate-spin" />
                                </div>
                            ) : allResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                                    <Search className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-lg font-medium">No results found</p>
                                    <p className="text-sm">
                                        {query ? `Try searching for "${query}"` : "Start typing to search"}
                                    </p>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {allResults.map((item, index) => renderResultItem(item, index))}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Student Popover */}
                    <StudentPopover
                        student={selectedStudent}
                        onClose={() => setSelectedStudent(null)}
                        onChatStarted={onClose}
                    />
                </>
            )}
        </AnimatePresence>
    );
}

export default GlobalSearch;
