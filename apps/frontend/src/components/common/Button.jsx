import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const variantStyles = {
    primary: "btn btn-primary",
    secondary: "btn btn-secondary",
    accent: "btn btn-accent",
    ghost: "btn btn-ghost",
    link: "btn btn-link",
    brand: "btn-brand",
    "brand-outline": "btn-brand-outline",
    "ghost-neutral": "btn-ghost-neutral",
    danger: "btn btn-error",
    error: "btn btn-error",
    success: "btn btn-success",
};

const sizeStyles = {
    xs: "btn-xs min-h-8 px-3 text-xs",
    sm: "btn-sm min-h-9 px-4 text-sm",
    md: "btn min-h-10 px-5 text-sm",
    lg: "btn-lg min-h-12 px-7 text-base",
    xl: "min-h-14 px-8 text-lg",
};

const iconSizes = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-5 h-5",
};

const Button = forwardRef(function Button(
    {
        children,
        variant = "primary",
        size = "md",
        loading = false,
        disabled = false,
        icon: Icon,
        iconPosition = "left",
        className = "",
        fullWidth = false,
        rounded = false,
        ...props
    },
    ref
) {
    const baseStyle = variantStyles[variant] || variantStyles.primary;
    const szStyle = sizeStyles[size] || sizeStyles.md;

    return (
        <button
            ref={ref}
            className={[
                baseStyle,
                szStyle,
                fullWidth ? "w-full" : "",
                rounded ? "!rounded-full" : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2" aria-hidden>
                    <Loader2 className={`animate-spin ${iconSizes[size]}`} />
                </span>
            ) : (
                <>
                    {Icon && iconPosition === "left" && (
                        <Icon className={iconSizes[size]} />
                    )}
                    {children}
                    {Icon && iconPosition === "right" && (
                        <Icon className={iconSizes[size]} />
                    )}
                </>
            )}
        </button>
    );
});

export default Button;
