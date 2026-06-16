import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
    showClose = true,
    closeOnOverlayClick = true,
    className = "",
}) {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        full: "max-w-full",
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Modal Content */}
                <div
                ref={modalRef}
                className={`glass-panel relative w-full ${sizeClasses[size]} bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 animate-in fade-in zoom-in-95 duration-200 ${className}`}
            >
                {/* Header */}
                {(title || showClose) && (
                    <div className="flex items-center justify-between mb-4">
                        {title && (
                            <h2
                                id="modal-title"
                                className="text-xl font-bold text-slate-900 dark:text-white"
                            >
                                {title}
                            </h2>
                        )}
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div>{children}</div>
            </div>
        </div>
    );
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    loading = false,
}) {
    const variantClasses = {
        danger: "btn-error",
        warning: "btn-warning",
        primary: "btn-primary",
        success: "btn-success",
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>

            <div className="flex gap-3 justify-end">
                <button
                    onClick={onClose}
                    className="btn btn-ghost"
                    disabled={loading}
                >
                    {cancelLabel}
                </button>
                <button
                    onClick={onConfirm}
                    className={`btn ${variantClasses[variant]} ${loading ? "loading" : ""}`}
                    disabled={loading}
                >
                    {loading && <span className="loading loading-spinner loading-sm" />}
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}
