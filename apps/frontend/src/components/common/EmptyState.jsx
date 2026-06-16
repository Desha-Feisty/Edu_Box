import { FileQuestion, Plus, Search } from "lucide-react";

export function EmptyState({
    title = "No data found",
    description = "There's nothing to display here yet.",
    icon: Icon = FileQuestion,  
    actionLabel,
    onAction,
    className = "",
}) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {title}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-6">
                {description}
            </p>

            {actionLabel && onAction && (
                <button onClick={onAction} className="btn-brand">
                    <Plus className="w-4 h-4" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

export function EmptySearch({ onClear }) {
    return (
        <EmptyState
            title="No results found"
            description="Try adjusting your search or filters to find what you're looking for."
            icon={Search}
            actionLabel="Clear Search"
            onAction={onClear}
        />
    );
}

export function EmptyList({
    itemType = "items",
    actionLabel,
    onAction,
}) {
    return (
        <EmptyState
            title={`No ${itemType} yet`}
            description={`Get started by creating your first ${itemType.slice(0, -1)}.`}
            icon={FileQuestion}
            actionLabel={actionLabel}
            onAction={onAction}
        />
    );
}