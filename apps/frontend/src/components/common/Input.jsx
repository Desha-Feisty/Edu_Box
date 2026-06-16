import { forwardRef, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const Input = forwardRef(function Input(
    {
        label,
        error,
        icon: Icon,
        type = "text",
        className = "",
        containerClassName = "",
        disabled = false,
        ...props
    },
    ref
) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
        <div className={`form-control ${containerClassName}`}>
            {label && (
                <label className="label pb-1.5" htmlFor={props.id}>
                    <span className="label-text font-medium text-slate-700 dark:text-slate-300 text-sm">
                        {label}
                    </span>
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors duration-200">
                        <Icon className="w-4 h-4" />
                    </div>
                )}
                <input
                    ref={ref}
                    id={props.id}
                    type={resolvedType}
                    disabled={disabled}
                    className={[
                        "input w-full h-11 rounded-xl border-2 bg-white dark:bg-base-300/60",
                        "text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500",
                        "transition-all duration-200 ease-out",
                        "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:shadow-lg focus:shadow-brand-500/10",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-base-300/30",
                        Icon ? "pl-10" : "pl-3.5",
                        isPassword ? "pr-11" : "pr-3.5",
                        error
                            ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20 focus:shadow-red-500/10 input-error"
                            : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500",
                        className,
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    aria-invalid={!!error}
                    aria-describedby={error && props.id ? `${props.id}-error` : undefined}
                    {...props}
                />

                {isPassword && (
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                            ) : (
                                <Eye className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {error && (
                <label className="label pt-1" id={props.id ? `${props.id}-error` : undefined}>
                    <span className="label-text-alt text-red-500 flex items-center gap-1.5 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                    </span>
                </label>
            )}
        </div>
    );
});

const Textarea = forwardRef(function Textarea(
    { label, error, className = "", containerClassName = "", ...props },
    ref
) {
    return (
        <div className={`form-control ${containerClassName}`}>
            {label && (
                <label className="label pb-1.5">
                    <span className="label-text font-medium text-slate-700 dark:text-slate-300 text-sm">
                        {label}
                    </span>
                </label>
            )}
            <textarea
                ref={ref}
                className={`textarea textarea-bordered rounded-xl border-2 bg-white dark:bg-base-300/60
                    border-slate-300 dark:border-slate-600
                    hover:border-slate-400 dark:hover:border-slate-500
                    focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
                    text-slate-900 dark:text-slate-100 placeholder:text-slate-400
                    transition-all duration-200
                    ${error ? "textarea-error" : ""} ${className}`}
                {...props}
            />
            {error && (
                <label className="label pt-1">
                    <span className="label-text-alt text-red-500 flex items-center gap-1.5 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                    </span>
                </label>
            )}
        </div>
    );
});

const Select = forwardRef(function Select(
    { label, error, options = [], placeholder, className = "", containerClassName = "", ...props },
    ref
) {
    return (
        <div className={`form-control ${containerClassName}`}>
            {label && (
                <label className="label pb-1.5">
                    <span className="label-text font-medium text-slate-700 dark:text-slate-300 text-sm">
                        {label}
                    </span>
                </label>
            )}
            <select
                ref={ref}
                className={`select select-bordered rounded-xl border-2 bg-white dark:bg-base-300/60
                    border-slate-300 dark:border-slate-600
                    hover:border-slate-400 dark:hover:border-slate-500
                    focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
                    text-slate-900 dark:text-slate-100
                    transition-all duration-200
                    ${error ? "select-error" : ""} ${className}`}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && (
                <label className="label pt-1">
                    <span className="label-text-alt text-red-500 flex items-center gap-1.5 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                    </span>
                </label>
            )}
        </div>
    );
});

export { Input, Textarea, Select };
