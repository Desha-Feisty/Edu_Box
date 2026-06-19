/**
 * Shared date formatting utilities.
 * Replaces multiple inline formatDate helpers across the codebase.
 */

/**
 * "Jan 15, 2026, 3:30 PM"
 */
export function formatDateTime(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

/**
 * "Jan 15, 2026"
 */
export function formatDateShort(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/**
 * "January 15, 2026, 3:30 PM" — long month version
 */
export function formatDateLong(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

/**
 * "2 hours ago", "Yesterday", "Jan 15"
 */
export function formatTimeAgo(dateString) {
    if (!dateString) return "";
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDateShort(dateString);
}

/**
 * "Today", "Yesterday", or the date
 */
export function formatRelative(dateString) {
    if (!dateString) return "";
    const now = new Date();
    const date = new Date(dateString);
    const diffDays = Math.floor((now - date) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return formatDateShort(dateString);
}

/**
 * "2026-01-15T15:30" — for input[type=datetime-local]
 */
export function formatDateInput(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * "en-GB" locale date — e.g., "15/01/2026"
 */
export function formatDateGB(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB");
}
