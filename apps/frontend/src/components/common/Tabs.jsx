import { useState } from "react";

/**
 * Accessible tab component.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, content: ReactNode}>} props.tabs
 * @param {string} [props.defaultTab] - Key of initially active tab
 * @param {(key: string) => void} [props.onChange] - Called when active tab changes
 * @param {string} [props.variant="underline"] - "underline" | "pills" | "tabs"
 * @param {string} [props.className=""]
 */
export default function Tabs({ tabs = [], defaultTab, onChange, variant = "underline", className = "" }) {
    const [active, setActive] = useState(defaultTab ?? (tabs[0]?.key ?? ""));

    function handleSelect(key) {
        setActive(key);
        if (onChange) onChange(key);
    }

    if (!tabs.length) return null;

    const tabStyles = {
        underline: {
            list: "tabs tabs-bordered",
            tab: (isActive) =>
                `tab ${isActive ? "tab-active text-brand-700 dark:text-brand-400 font-semibold" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`,
        },
        pills: {
            list: "flex flex-wrap gap-1",
            tab: (isActive) =>
                `btn btn-sm rounded-xl ${isActive ? "btn-primary" : "btn-ghost text-slate-600 dark:text-slate-400"}`,
        },
        tabs: {
            list: "tabs tabs-boxed bg-slate-100 dark:bg-base-300/40 p-1 rounded-xl",
            tab: (isActive) =>
                `tab rounded-lg text-sm transition-all ${isActive ? "tab-active bg-white dark:bg-base-200 shadow-sm font-semibold" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`,
        },
    };

    const style = tabStyles[variant] || tabStyles.underline;

    return (
        <div className={className}>
            <div role="tablist" aria-orientation="horizontal" className={style.list}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={active === tab.key}
                        className={style.tab(active === tab.key)}
                        onClick={() => handleSelect(tab.key)}
                        disabled={tab.disabled}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div role="tabpanel" className="mt-4">
                {tabs.find((t) => t.key === active)?.content ?? null}
            </div>
        </div>
    );
}
