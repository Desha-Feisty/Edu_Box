import { forwardRef } from "react";

const cardVariants = {
    default:
        "bg-white dark:bg-base-200/80 border border-slate-200/80 dark:border-white/10 shadow-sm shadow-slate-200/60 dark:shadow-black/10",
    elevated:
        "bg-white dark:bg-base-200/80 border border-slate-200/80 dark:border-white/10 shadow-lg shadow-slate-200/70 dark:shadow-black/20 hover:shadow-xl hover:-translate-y-0.5",
    glass:
        "glass-card",
    glassStrong:
        "glass-strong",
    outline:
        "bg-transparent dark:bg-transparent border-2 border-slate-200 dark:border-slate-700",
    ghost:
        "bg-slate-50/50 dark:bg-white/[0.03] hover:bg-slate-100/50 dark:hover:bg-white/[0.06]",
};

const paddingVariants = {
    none: "",
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-5",
    lg: "p-5 sm:p-6",
    xl: "p-6 sm:p-8",
};

const radiusVariants = {
    none: "",
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-3xl",
};

const Card = forwardRef(function Card(
    {
        children,
        variant = "default",
        padding = "md",
        radius = "lg",
        className = "",
        hover = false,
        ...props
    },
    ref
) {
    return (
        <div
            ref={ref}
            className={[
                "relative overflow-hidden transition-all duration-300",
                cardVariants[variant] || cardVariants.default,
                paddingVariants[padding] || paddingVariants.md,
                radiusVariants[radius] || radiusVariants.lg,
                hover ? "cursor-pointer hover:shadow-xl hover:-translate-y-0.5" : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...props}
        >
            {children}
        </div>
    );
});

// Header sub-component for consistent card headers
function CardHeader({ title, subtitle, action, className = "" }) {
    return (
        <div
            className={`flex items-start justify-between gap-4 mb-4 ${className}`}
        >
            <div className="min-w-0 flex-1">
                {title && (
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                        {title}
                    </h3>
                )}
                {subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
}

// Body sub-component
function CardBody({ children, className = "" }) {
    return <div className={className}>{children}</div>;
}

// Footer sub-component
function CardFooter({ children, className = "", border = true }) {
    return (
        <div
            className={[
                "mt-4 pt-4",
                border ? "border-t border-slate-200 dark:border-white/10" : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </div>
    );
}

export default Card;
export { CardHeader, CardBody, CardFooter };
