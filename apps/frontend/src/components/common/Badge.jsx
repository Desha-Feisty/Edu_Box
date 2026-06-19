const variantStyles = {
    default: "badge-ghost",
    primary: "badge-primary",
    secondary: "badge-secondary",
    accent: "badge-accent",
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
    info: "badge-info",
    neutral: "badge-neutral",
};

const sizeStyles = {
    xs: "badge-xs",
    sm: "badge-sm",
    md: "badge-md",
    lg: "badge-lg",
};

/**
 * Badge component for statuses, counts, and labels.
 *
 * @param {object} props
 * @param {"default"|"primary"|"secondary"|"accent"|"success"|"warning"|"error"|"info"|"neutral"} [props.variant="default"]
 * @param {"xs"|"sm"|"md"|"lg"} [props.size="sm"]
 * @param {boolean} [props.outline=false] - Use outline style
 * @param {string} [props.className=""]
 */
export default function Badge({
    children,
    variant = "default",
    size = "sm",
    outline = false,
    className = "",
    ...props
}) {
    return (
        <span
            className={[
                "badge",
                variantStyles[variant] || variantStyles.default,
                sizeStyles[size] || sizeStyles.sm,
                outline ? "badge-outline" : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...props}
        >
            {children}
        </span>
    );
}
