import { motion } from "framer-motion";
import {
    BookOpen,
    Users,
    FileText,
    ClipboardList,
    Clock,
    TrendingUp,
    Award,
} from "lucide-react";

function ProgressCard({
    title,
    value,
    total,
    subtitle,
    icon: Icon,  
    trend,
    trendValue,
    color = "violet",
    type = "progress",
}) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

    const colorClasses = {
        violet: {
            bg: "bg-violet-500",
            light: "bg-violet-100 dark:bg-violet-500/20",
            text: "text-violet-600 dark:text-violet-400",
        },
        blue: {
            bg: "bg-blue-500",
            light: "bg-blue-100 dark:bg-blue-500/20",
            text: "text-blue-600 dark:text-blue-400",
        },
        green: {
            bg: "bg-green-500",
            light: "bg-green-100 dark:bg-green-500/20",
            text: "text-green-600 dark:text-green-400",
        },
        amber: {
            bg: "bg-amber-500",
            light: "bg-amber-100 dark:bg-amber-500/20",
            text: "text-amber-600 dark:text-amber-400",
        },
        red: {
            bg: "bg-red-500",
            light: "bg-red-100 dark:bg-red-500/20",
            text: "text-red-600 dark:text-red-400",
        },
        purple: {
            bg: "bg-purple-500",
            light: "bg-purple-100 dark:bg-purple-500/20",
            text: "text-purple-600 dark:text-purple-400",
        },
    };

    const colors = colorClasses[color] || colorClasses.violet;

    if (type === "stat") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                            {title}
                        </p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">
                            {value}
                            {total !== undefined && (
                                <span className="text-lg font-medium text-slate-400 dark:text-slate-500">
                                    /{total}
                                </span>
                            )}
                        </p>
                        {subtitle && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div className={`w-12 h-12 rounded-2xl ${colors.light} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                </div>
                {trend && (
                    <div className="flex items-center gap-1 mt-3">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {trendValue}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            vs last week
                        </span>
                    </div>
                )}
            </motion.div>
        );
    }

    if (type === "compact") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-white dark:bg-base-200 rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                            {title}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {percentage}%
                        </p>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full ${colors.bg} rounded-full`}
                    />
                </div>
            </motion.div>
        );
    }

    // Default: full progress card
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white dark:bg-base-200 rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow"
        >
            {/* Icon */}
            <div className={`absolute top-4 right-4 w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>

            {/* Title */}
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                {title}
            </p>

            {/* Value */}
            <div className="flex items-end gap-2 mb-4">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    {value}
                </span>
                {total !== undefined && (
                    <span className="text-lg font-medium text-slate-400 dark:text-slate-500 mb-1">
                        / {total}
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${colors.bg} rounded-full`}
                />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {percentage}% complete
                </p>
                {subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Trend */}
            {trend && (
                <div className="flex items-center gap-1 mt-3">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {trendValue}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        from last week
                    </span>
                </div>
            )}
        </motion.div>
    );
}

export default ProgressCard;