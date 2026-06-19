import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useNotificationStore from "../../stores/NotificationStore";
import useChatStore from "../../stores/ChatStore";
import { ConfirmDialog } from "../common/Modal";
import {
    Bell,
    X,
    Check,
    FileText,
    MessageSquare,
    AlertCircle,
    Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import toast from "react-hot-toast";

const iconColors = {
    quiz: { bg: "bg-blue-100 dark:bg-blue-500/15", color: "text-blue-500" },
    "quiz-graded": { bg: "bg-green-100 dark:bg-green-500/15", color: "text-green-500" },
    "quiz-missed": { bg: "bg-red-100 dark:bg-red-500/15", color: "text-red-500" },
    note: { bg: "bg-amber-100 dark:bg-amber-500/15", color: "text-amber-500" },
    chat: { bg: "bg-purple-100 dark:bg-purple-500/15", color: "text-purple-500" },
    system: { bg: "bg-slate-100 dark:bg-slate-500/15", color: "text-slate-500" },
};

function NotificationCenter({ isOpen, onClose }) {
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotificationStore();
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    const getIcon = (type) => {
        const icons = {
            quiz: FileText,
            "quiz-graded": FileText,
            "quiz-missed": AlertCircle,
            note: FileText,
            chat: MessageSquare,
            system: Bell,
        };
        const Icon = icons[type] || Bell;
        return <Icon className="w-5 h-5" />;
    };

    const getColors = (type) => iconColors[type] || iconColors.system;

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const formatTime = (date) => {
        try {
            const d = new Date(date);
            const now = new Date();
            const diff = now.getTime() - d.getTime();
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (mins < 1) return "Just now";
            if (mins < 60) return `${mins}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            return format(d, "MMM d");
        } catch {
            return "Unknown";
        }
    };

    const handleNotificationClick = useCallback(
        (notification) => {
            if (!notification.read) markAsRead(notification._id);

            if (!notification.link) return;

            // Handle chat links (internal routing)
            if (notification.link.startsWith("__chat__")) {
                const params = new URLSearchParams(notification.link.replace("__chat__?", ""));
                const peerId = params.get("peerId");
                const peerName = params.get("peerName");
                const courseId = params.get("courseId");
                if (peerId && courseId) {
                    useChatStore.getState().openChat(peerId, peerName || "User", courseId);
                    onClose();
                }
                return;
            }

            navigate(notification.link);
            onClose();
        },
        [markAsRead, navigate, onClose],
    );

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteNotification(deletingId);
        } catch {
            toast.error("Failed to delete notification");
        }
        setDeletingId(null);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Glassmorphism Backdrop */}
                        <motion.div
                            key="notif-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/35 dark:bg-black/60 backdrop-blur-sm z-[200]"
                        />

                        {/* Glassmorphism Side Panel */}
                        <motion.div
                            key="notif-panel"
                            initial={{ opacity: 0, x: "100%" }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed right-0 top-0 h-full w-full max-w-md bg-white/65 dark:bg-slate-900/85 backdrop-blur-2xl border-l border-white/40 dark:border-white/[0.06] shadow-2xl flex flex-col z-[250]"
                        >
                            {/* Glass Header */}
                            <div className="flex items-center justify-between px-6 py-6 border-b border-black/[0.06] dark:border-white/[0.06]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/35">
                                        <Bell className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                            Notifications
                                        </h2>
                                        {unreadCount > 0 && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {unreadCount} unread
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/60 border border-white/50 dark:border-white/[0.1] cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                </button>
                            </div>

                            {/* Mark all read button */}
                            {unreadCount > 0 && (
                                <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-violet-500/5 dark:bg-violet-500/10">
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/20 dark:border-violet-500/25 cursor-pointer hover:bg-violet-500/20 dark:hover:bg-violet-500/25 transition-colors"
                                    >
                                        <Check className="w-[18px] h-[18px]" />
                                        Mark all as read
                                    </button>
                                </div>
                            )}

                            {/* Notifications List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
                                        <div className="w-[72px] h-[72px] rounded-full bg-violet-500/10 dark:bg-violet-500/15 flex items-center justify-center">
                                            <Bell className="w-9 h-9 text-violet-500" />
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Your inbox is empty!</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">You&apos;re all caught up</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {notifications.map((notification) => {
                                            const colors = getColors(notification.type);
                                            const isUnread = !notification.read;
                                            return (
                                                <div
                                                    key={notification._id}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className={`flex gap-3.5 p-4 rounded-2xl cursor-pointer transition-all duration-200 relative group ${
                                                        isUnread
                                                            ? "bg-violet-500/10 dark:bg-violet-500/12 border border-violet-500/15 dark:border-violet-500/20"
                                                            : "bg-white/40 dark:bg-slate-800/30 border border-white/30 dark:border-white/[0.04]"
                                                    } hover:bg-white/80 dark:hover:bg-slate-800/60 hover:shadow-md`}
                                                >
                                                    {/* Icon */}
                                                    <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center shrink-0 ${colors.color}`}>
                                                        {getIcon(notification.type)}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className={`text-sm ${isUnread ? "font-semibold text-slate-900 dark:text-slate-100" : "font-medium text-slate-600 dark:text-slate-400"} truncate max-w-[85%]`}>
                                                                {notification.title}
                                                            </p>
                                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-2 shrink-0">
                                                                {formatTime(notification.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                    </div>

                                                    {/* Delete button (visible on hover) */}
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, notification._id)}
                                                        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white/70 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-slate-400"
                                                        aria-label="Delete notification"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="px-6 py-4 text-center border-t border-black/[0.06] dark:border-white/[0.06] bg-violet-500/5 dark:bg-violet-500/10">
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 tracking-widest uppercase font-semibold">
                                        End of notifications
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation (outside panel conditional so it persists independently) */}
            <ConfirmDialog
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={confirmDelete}
                title="Delete Notification?"
                message="Are you sure you want to delete this notification?"
                confirmLabel="Delete"
                variant="danger"
            />
        </>
    );
}

export default NotificationCenter;
