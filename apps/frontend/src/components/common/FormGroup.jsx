import { AlertCircle } from "lucide-react";

/**
 * Form field wrapper with label, help text, and error display.
 *
 * @param {object} props
 * @param {string} [props.label] - Field label
 * @param {string} [props.help] - Help text below the field
 * @param {string} [props.error] - Error message
 * @param {string} [props.id] - ID for label/htmlFor association
 * @param {boolean} [props.required] - Show required indicator
 * @param {string} [props.className=""]
 * @param {ReactNode} props.children - The form control element(s)
 */
export default function FormGroup({
    label,
    help,
    error,
    id,
    required = false,
    className = "",
    children,
}) {
    return (
        <div className={`form-control ${className}`}>
            {label && (
                <label className="label pb-2" htmlFor={id}>
                    <span className="label-text font-medium text-slate-700 dark:text-slate-300 text-sm">
                        {label}
                        {required && (
                            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                        )}
                    </span>
                </label>
            )}

            {children}

            {help && !error && (
                <label className="label pt-1">
                    <span className="label-text-alt text-slate-400 dark:text-slate-500 text-xs">
                        {help}
                    </span>
                </label>
            )}

            {error && (
                <label className="label pt-1" id={id ? `${id}-error` : undefined}>
                    <span className="label-text-alt text-red-500 flex items-center gap-1.5 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                    </span>
                </label>
            )}
        </div>
    );
}
