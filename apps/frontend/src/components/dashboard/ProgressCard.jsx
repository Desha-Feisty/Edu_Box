import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

const colorClasses = {
    brand: {
        bg: "bg-brand-500",
        light: "bg-brand-100 dark:bg-brand-500/20",
        text: "text-brand-600 dark:text-brand-400",
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
    teal: {
        bg: "bg-teal-500",
        light: "bg-teal-100 dark:bg-teal-500/20",
        text: "text-teal-600 dark:text-teal-400",
    },
    neutral: {
        bg: "bg-slate-500",
        light: "bg-slate-100 dark:bg-slate-500/20",
        text: "text-slate-600 dark:text-slate-400",
    },
};

function ProgressCard({
    title,
    value,
    total,
    subtitle,
    icon: Icon,
    trend,
    trendValue,
    color = "brand",
    type = "progress",
}) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const colors = colorClasses[color] || colorClasses.brand;

    // ── Stat type (compact number display) ─────────────────────────
    if (type === "stat") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-white dark:bg-base-200 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-white/[0.06] hover:shadow-md transition-all duration-200"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5 truncate">
                            {title}
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {value}
                            {total !== undefined && (
                                <span className="text-base font-medium text-slate-400 dark:text-slate-500 ml-1">
                                    /{total}
                                </span>
                            )}
                        </p>
                        {subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div
                        className={`w-11 h-11 rounded-xl ${colors.light} flex items-center justify-center flex-shrink-0`}
                    >
                        <Icon className={`w-5.5 h-5.5 ${colors.text}`} />
                    </div>
                </div>
                {trend && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            {trendValue}
                        </span>
                        <span className="text-xs text-slate-400">vs last week</span>
                    </div>
                )}
            </motion.div>
        );
    }

    // ── Compact type (horizontal with progress bar) ─────────────────
    if (type === "compact") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-base-200 rounded-xl p-4 border border-slate-200/60 dark:border-white/[0.06]"
            >
                <div className="flex items-center gap-3">
                    <div
                        className={`w-9 h-9 rounded-lg ${colors.light} flex items-center justify-center shrink-0`}
                    >
                        <Icon className={`w-4.5 h-4.5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                            {title}
                        </p>
                        {subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-base font-bold text-slate-900 dark:text-white">
                            {percentage}%
                        </p>
                    </div>
                </div>
                <div className="mt-2.5 h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
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

    // ── Default: full progress card ─────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white dark:bg-base-200 rounded-2xl p-5 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-md transition-all duration-200"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <div className="flex items-end gap-1.5 mt-1">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {value}
                        </span>
                        {total !== undefined && (
                            <span className="text-base font-medium text-slate-400 dark:text-slate-500 mb-0.5">
                                / {total}
                            </span>
                        )}
                    </div>
                </div>
                <div
                    className={`w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center flex-shrink-0`}
                >
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${colors.bg} rounded-full`}
                />
            </div>

            <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {percentage}% complete
                </p>
                {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {subtitle}
                    </p>
                )}
            </div>

            {trend && (
                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        {trendValue}
                    </span>
                    <span className="text-xs text-slate-400">from last week</span>
                </div>
            )}
        </motion.div>
    );
}

export default ProgressCard;
