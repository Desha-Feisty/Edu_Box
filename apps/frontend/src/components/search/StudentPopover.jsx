import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import useAuthStore from "../../stores/Authstore";
import useChatStore from "../../stores/ChatStore";
import useThemeStore from "../../stores/ThemeStore";
import { motion } from "framer-motion";
import { X, MessageCircle, Star, TrendingUp, Clock, BookOpen, Mail } from "lucide-react";

function StudentPopover({ student, onClose, onChatStarted }) {
    const { token } = useAuthStore();
    const openChat = useChatStore((state) => state.openChat);
    const { theme } = useThemeStore();
    const isDark = theme === "night";
    const [gradesData, setGradesData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Glassmorphism styles
    const glassStyle = {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: isDark ? "0 8px 32px rgba(0, 0, 0, 0.4)" : "0 8px 32px rgba(0, 0, 0, 0.08)",
    };

    const glassBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.3)";

    const fetchGrades = useCallback(async () => {
        if (!student?._id) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.get(`/api/grades/student/${student._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setGradesData(res.data);
        } catch {
            setError("Failed to load grades");
        } finally {
            setIsLoading(false);
        }
    }, [student, token]);

     
    useEffect(() => {
        if (student?._id) {
            fetchGrades();
        }
    }, [student?._id, fetchGrades]);

    const handleStartChat = () => {
        if (gradesData?.courseId) {
            openChat(student._id, student.name, gradesData.courseId);
            onChatStarted?.();
        }
    };

    if (!student) return null;

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                onClick={onClose}
            />

            {/* Popover */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                style={{
                    ...glassStyle,
                    position: "fixed",
                    top: "12vh",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "100%",
                    maxWidth: "32rem",
                    maxHeight: "75vh",
                    borderRadius: "1.5rem",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 60,
                }}
            >
                {/* Header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    borderBottom: `1px solid ${glassBorder}`,
                    background: isDark ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.05)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: 600,
                            fontSize: 18,
                        }}>
                            {student.name?.charAt(0)?.toUpperCase() || "S"}
                        </div>
                        <div>
                            <h3 style={{ fontWeight: 600, fontSize: 18, color: isDark ? "#f1f5f9" : "#1e293b", margin: 0 }}>{student.name}</h3>
                            <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                                <Mail className="w-3 h-3" />
                                {student.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: 8,
                            borderRadius: 12,
                            background: "transparent",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: 24,
                    maxHeight: "55vh",
                    overflowY: "auto",
                    flex: 1,
                }}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-700 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-4 text-red-500">{error}</div>
                    ) : gradesData ? (
                        <div className="space-y-6">
                            {/* Overall Grade */}
                            {gradesData.overallAverage !== null && (
                                <div style={{
                                    background: isDark ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.05)",
                                    borderRadius: "1rem",
                                    padding: 16,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Star className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                            <span style={{ fontWeight: 500, color: isDark ? "#cbd5e1" : "#475569" }}>Overall Average</span>
                                        </div>
                                        <span style={{ fontSize: 30, fontWeight: 700, color: "#6366f1" }}>
                                            {gradesData.overallAverage}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Per-Course Grades */}
                            {gradesData.perCourseGrades?.length > 0 && (
                                <div>
                                    <h4 style={{ fontWeight: 500, color: isDark ? "#cbd5e1" : "#475569", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                        <BookOpen className="w-4 h-4" />
                                        Course Grades
                                    </h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {gradesData.perCourseGrades.map((course, idx) => (
                                            <div key={idx} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: 12,
                                                background: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(241, 245, 249, 0.5)",
                                                borderRadius: 12,
                                            }}>
                                                <span style={{ fontWeight: 500, color: isDark ? "#cbd5e1" : "#475569", marginRight: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {course.courseTitle}
                                                </span>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                    <span style={{ fontSize: 14, color: "#94a3b8" }}>
                                                        {course.completedQuizzes}/{course.totalQuizzes} quizzes
                                                    </span>
                                                    {course.grade !== null ? (
                                                        <span style={{
                                                            padding: "4px 12px",
                                                            borderRadius: 9999,
                                                            fontSize: 14,
                                                            fontWeight: 500,
                                                            background: course.grade >= 80 ? "rgba(34, 197, 94, 0.15)" : course.grade >= 60 ? "rgba(234, 179, 8, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                                            color: course.grade >= 80 ? "#22c55e" : course.grade >= 60 ? "#eab308" : "#ef4444",
                                                        }}>
                                                            {course.grade}%
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: 14, color: "#94a3b8" }}>No grades</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Activity */}
                            {gradesData.recentActivity?.length > 0 && (
                                <div>
                                    <h4 style={{ fontWeight: 500, color: isDark ? "#cbd5e1" : "#475569", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                        <TrendingUp className="w-4 h-4" />
                                        Recent Activity
                                    </h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {gradesData.recentActivity.map((activity, idx) => (
                                            <div key={idx} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: 12,
                                                background: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(241, 245, 249, 0.5)",
                                                borderRadius: 12,
                                            }}>
                                                <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                                                    <p style={{ fontWeight: 500, color: isDark ? "#cbd5e1" : "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                                                        {activity.quizTitle}
                                                    </p>
                                                    <p style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, margin: 0 }}>
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(activity.submittedAt).toLocaleDateString("en-GB")}
                                                    </p>
                                                </div>
                                                <span style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 9999,
                                                    fontSize: 14,
                                                    fontWeight: 500,
                                                    background: activity.percentage >= 80 ? "rgba(34, 197, 94, 0.15)" : activity.percentage >= 60 ? "rgba(234, 179, 8, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                                    color: activity.percentage >= 80 ? "#22c55e" : activity.percentage >= 60 ? "#eab308" : "#ef4444",
                                                }}>
                                                    {activity.percentage}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No Grades */}
                            {gradesData.overallAverage === null && gradesData.perCourseGrades?.length === 0 && (
                                <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No grades available yet</p>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer with Chat Button */}
                <div style={{
                    padding: "16px 24px",
                    borderTop: `1px solid ${glassBorder}`,
                }}>
                    <button
                        onClick={handleStartChat}
                        disabled={!gradesData?.courseId}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "12px 16px",
                            background: !gradesData?.courseId ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "white",
                            borderRadius: 12,
                            fontWeight: 500,
                            border: "none",
                            cursor: gradesData?.courseId ? "pointer" : "not-allowed",
                            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
                        }}
                    >
                        <MessageCircle className="w-5 h-5" />
                        {gradesData?.hasExistingChat ? "Continue Chat" : "Start Chat"}
                    </button>
                </div>
            </motion.div>

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
                    zIndex: 59,
                }}
                onClick={onClose}
            />
        </>
    );
}

export default StudentPopover;
