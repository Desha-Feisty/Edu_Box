import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Simple pagination control.
 *
 * @param {object} props
 * @param {number} props.current - Current page (1-indexed)
 * @param {number} props.total - Total pages
 * @param {function} props.onChange - Called with new page number
 * @param {string} [props.className=""]
 */
export default function Pagination({ current, total, onChange, className = "" }) {
    if (total <= 1) return null;

    const siblings = 1;
    const pages = [];

    pages.push(1);

    const left = Math.max(2, current - siblings);
    const right = Math.min(total - 1, current + siblings);

    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push("...");

    if (total > 1) pages.push(total);

    return (
        <div className={["flex items-center gap-1", className].filter(Boolean).join(" ")}>
            <button
                className="btn btn-ghost btn-sm rounded-lg"
                disabled={current <= 1}
                onClick={() => onChange(current - 1)}
                aria-label="Previous page"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {pages.map((p, i) =>
                p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 dark:text-slate-500 text-sm">
                        ...
                    </span>
                ) : (
                    <button
                        key={p}
                        className={[
                            "btn btn-sm min-w-9 rounded-lg",
                            p === current
                                ? "btn-primary"
                                : "btn-ghost text-slate-600 dark:text-slate-400",
                        ].join(" ")}
                        onClick={() => onChange(p)}
                        aria-current={p === current ? "page" : undefined}
                    >
                        {p}
                    </button>
                ),
            )}

            <button
                className="btn btn-ghost btn-sm rounded-lg"
                disabled={current >= total}
                onClick={() => onChange(current + 1)}
                aria-label="Next page"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
