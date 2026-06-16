export function Skeleton({ className = "" }) {
    return (
        <div
            className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="glass-card p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
            </div>
        </div>
    );
}

export function SkeletonList({ count = 3 }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="glass-card p-4 flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                        <Skeleton className="h-5 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
    return (
        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
            <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={`header-${i}`} className="h-6" />
                ))}
                {Array.from({ length: rows * cols }).map((_, i) => (
                    <Skeleton key={`row-${i}`} className="h-4" />
                ))}
            </div>
        </div>
    );
}

export function SkeletonForm() {
    return (
        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 space-y-4">
            <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
        </div>
    );
}