import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInSeconds } from "date-fns";
import {
    Clock,
    AlertTriangle,
    Pause,
    Play,
    RotateCcw,
    CheckCircle,
    XCircle,
} from "lucide-react";

function QuizTimer({
    endAt,
    totalDuration, // Total quiz duration in seconds (overrides auto-calc from endAt)
    onTimeUp,
    isPaused = false,
    onPauseToggle,
    showControls = true,
    size = "medium",
    minimal = false,
}) {
    // C1: Capture the total quiz duration for accurate progress bar
    const [initialTimeLeft] = useState(() => {
        if (!endAt) return 0;
        return Math.max(0, differenceInSeconds(new Date(endAt), new Date()));
    });

    const [timeLeft, setTimeLeft] = useState(() => {
        if (!endAt) return 0;
        return Math.max(0, differenceInSeconds(new Date(endAt), new Date()));
    });

    // Use totalDuration if provided, otherwise use the initial calculated timeLeft
    const totalDurationSec = totalDuration || initialTimeLeft;
    const progressPct = totalDurationSec > 0 ? Math.min(100, (timeLeft / totalDurationSec) * 100) : 0;

    // Update timer every second
    useEffect(() => {
        if (!endAt || isPaused) return;

        const interval = setInterval(() => {
            const remaining = differenceInSeconds(new Date(endAt), new Date());
            const newTimeLeft = Math.max(0, remaining);

            setTimeLeft(newTimeLeft);

            if (newTimeLeft <= 0) {
                onTimeUp?.();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endAt, isPaused, onTimeUp]);

    // Calculate time components
    const timeData = useMemo(() => {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;

        return { hours, minutes, seconds, total: timeLeft };
    }, [timeLeft]);

    // Urgency states
    const urgency = useMemo(() => {
        if (timeData.total === 0) return "expired";
        if (timeData.total <= 60) return "critical"; // < 1 minute
        if (timeData.total <= 300) return "danger"; // < 5 minutes
        if (timeData.total <= 600) return "warning"; // < 10 minutes
        return "normal";
    }, [timeData]);

    // Size config
    const sizeConfig = {
        small: {
            text: "text-sm",
            icon: "w-4 h-4",
            container: "px-2 py-1",
            pill: "px-2 py-0.5",
        },
        medium: {
            text: "text-base",
            icon: "w-5 h-5",
            container: "px-3 py-2",
            pill: "px-3 py-1",
        },
        large: {
            text: "text-xl",
            icon: "w-6 h-6",
            container: "px-4 py-3",
            pill: "px-4 py-1.5",
        },
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    // Urgency colors
    const urgencyColors = {
        normal: {
            bg: "bg-blue-500",
            text: "text-blue-600 dark:text-blue-400",
            bgLight: "bg-blue-100 dark:bg-blue-500/20",
            glow: "shadow-blue-500/25",
        },
        warning: {
            bg: "bg-amber-500",
            text: "text-amber-600 dark:text-amber-400",
            bgLight: "bg-amber-100 dark:bg-amber-500/20",
            glow: "shadow-amber-500/25",
        },
        danger: {
            bg: "bg-orange-500",
            text: "text-orange-600 dark:text-orange-400",
            bgLight: "bg-orange-100 dark:bg-orange-500/20",
            glow: "shadow-orange-500/25",
        },
        critical: {
            bg: "bg-red-500",
            text: "text-red-600 dark:text-red-400",
            bgLight: "bg-red-100 dark:bg-red-500/20",
            glow: "shadow-red-500/30 animate-pulse",
        },
        expired: {
            bg: "bg-slate-500",
            text: "text-slate-600 dark:text-slate-400",
            bgLight: "bg-slate-100 dark:bg-slate-700",
            glow: "",
        },
    };

    const colors = urgencyColors[urgency] || urgencyColors.normal;

    // Format time display
    const formatTime = () => {
        const { hours, minutes, seconds } = timeData;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const getUrgencyLabel = () => {
        switch (urgency) {
            case "critical":
                return "Time running out!";
            case "danger":
                return "Less than 5 minutes";
            case "warning":
                return "Less than 10 minutes";
            case "expired":
                return "Time's up!";
            default:
                return null;
        }
    };

    // Render compact/minimal display
    if (minimal) {
        return (
            <div
                className={`inline-flex items-center gap-1.5 rounded-full ${config.pill} ${colors.bgLight} ${colors.text} font-medium ${config.text}`}
            >
                <Clock className={config.icon} />
                <span>{formatTime()}</span>
                {urgency === "critical" && (
                    <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                    >
                        <AlertTriangle className={config.icon} />
                    </motion.span>
                )}
            </div>
        );
    }

    // Render full display
    return (
        <div className="space-y-3">
            {/* Timer Display */}
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`inline-flex items-center gap-3 rounded-2xl ${colors.bgLight} px-4 py-3 ${urgency === "expired" ? "" : "shadow-lg " + colors.glow}`}
            >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    {isPaused ? (
                        <Pause className="w-6 h-6 text-white" />
                    ) : urgency === "expired" ? (
                        <XCircle className="w-6 h-6 text-white" />
                    ) : urgency === "critical" ? (
                        <motion.div
                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                        >
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </motion.div>
                    ) : (
                        <Clock className="w-6 h-6 text-white" />
                    )}
                </div>

                {/* Time */}
                <div>
                    <motion.p
                        key={timeLeft}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`text-3xl font-bold ${colors.text}`}
                    >
                        {formatTime()}
                    </motion.p>
                    {getUrgencyLabel() && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`text-xs font-medium ${colors.text}`}
                        >
                            {getUrgencyLabel()}
                        </motion.p>
                    )}
                </div>

                {/* Pause/Resume Control */}
                {showControls && onPauseToggle && urgency !== "expired" && (
                    <button
                        onClick={onPauseToggle}
                        className={`ml-2 p-2 rounded-xl hover:bg-white/20 transition-colors`}
                    >
                        {isPaused ? (
                            <Play className="w-5 h-5 text-white" />
                        ) : (
                            <Pause className="w-5 h-5 text-white" />
                        )}
                    </button>
                )}
            </motion.div>

            {/* Progress Bar */}
            {urgency !== "expired" && (
                <div className="w-full">
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{
                                width: `${progressPct}%`,
                            }}
                            transition={{ duration: 1 }}
                            className={`h-full ${colors.bg} rounded-full`}
                        />
                    </div>
                </div>
            )}

            {/* Warning Message */}
            <AnimatePresence>
                {(urgency === "danger" || urgency === "critical") && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex items-center gap-2 p-3 rounded-xl ${colors.bgLight}`}
                    >
                        <AlertTriangle className={`w-5 h-5 ${colors.text}`} />
                        <p className={`text-sm font-medium ${colors.text}`}>
                            {urgency === "critical"
                                ? "Hurry! Submit your answers now!"
                                : "Don't forget to save your progress"}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default QuizTimer;
