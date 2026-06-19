/**
 * Shared CSV export utilities.
 * Replaces triplicated export functions in CourseGradesTab.
 */

/**
 * Fetch a blob from an API endpoint and trigger download.
 * @param {string} url - API endpoint returning a CSV blob
 * @param {string} filename - Desired download filename
 * @param {string} token - Auth bearer token
 */
export async function exportBlob(url, filename, token) {
    try {
        const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error("Export failed");
        const blob = await response.blob();
        triggerDownload(blob, filename);
    } catch (error) {
        console.error("Export failed:", error);
        throw error;
    }
}

/**
 * Create a CSV from row data and trigger download.
 * @param {Array<Array<string|number>>} rows - 2D array of row data
 * @param {string} filename - Desired download filename
 * @param {Array<string>} [headers] - Optional column headers (first row)
 */
export function exportData(rows, filename, headers) {
    const csvContent = [
        headers ? headers.join(",") : "",
        ...rows.map((row) => row.join(",")),
    ]
        .filter(Boolean)
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
}
