import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import EmptyState from "./EmptyState";
import Pagination from "./Pagination";

/**
 * Sortable, paginated data table.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, sortable?: boolean, render?: function}>} props.columns
 * @param {Array<object>} props.data
 * @param {number} [props.pageSize=10]
 * @param {boolean} [props.searchable=false]
 * @param {string} [props.searchPlaceholder="Search..."]
 * @param {string} [props.emptyMessage="No data found"]
 * @param {string} [props.className=""]
 */
export default function DataTable({
    columns = [],
    data = [],
    pageSize = 10,
    searchable = false,
    searchPlaceholder = "Search...",
    emptyMessage = "No data found",
    className = "",
}) {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    // Filter by search
    const filtered = useMemo(() => {
        if (!searchable || !search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter((row) =>
            columns.some((col) => {
                const val = row[col.key];
                return val != null && String(val).toLowerCase().includes(q);
            }),
        );
    }, [data, search, searchable, columns]);

    // Sort
    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        return [...filtered].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            const cmp = typeof aVal === "number"
                ? aVal - bVal
                : String(aVal).localeCompare(String(bVal));
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    // Paginate
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

    // Reset page when data shrinks below current page
    const prevTotalRef = useRef(totalPages);
    useEffect(() => {
        const prev = prevTotalRef.current;
        if (prev > totalPages && page > totalPages) {
            setPage(totalPages);
        }
        prevTotalRef.current = totalPages;
    }, [totalPages, page]);

    function toggleSort(key) {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    }

    const SortIcon = ({ column }) => {
        if (!column.sortable) return null;
        if (sortKey !== column.key) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
        return sortDir === "asc"
            ? <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
            : <ArrowDown className="w-3.5 h-3.5 text-brand-600" />;
    };

    if (!columns.length) return null;

    return (
        <div className={className}>
            {searchable && (
                <div className="relative mb-3 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder={searchPlaceholder}
                        className="input input-bordered input-sm w-full pl-9 rounded-lg
                            bg-white dark:bg-base-300/60
                            border-slate-300 dark:border-slate-600
                            text-slate-900 dark:text-slate-100
                            placeholder:text-slate-400"
                    />
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="table w-full">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-base-300/40">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={[
                                        "text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold",
                                        col.sortable ? "cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200" : "",
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => col.sortable && toggleSort(col.key)}
                                >
                                    <span className="flex items-center gap-1.5">
                                        {col.label}
                                        <SortIcon column={col} />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="py-12">
                                    <EmptyState message={emptyMessage} />
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row, i) => (
                                <tr
                                    key={row.id ?? i}
                                    className="hover:bg-slate-50 dark:hover:bg-base-300/30 transition-colors"
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className="text-sm text-slate-700 dark:text-slate-300">
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                    <Pagination
                        current={page}
                        total={totalPages}
                        onChange={setPage}
                    />
                </div>
            )}
        </div>
    );
}
