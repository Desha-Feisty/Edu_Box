import { lazy, Suspense } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Lazy loaded chart components for admin pages
// This reduces initial bundle size by ~300KB

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-base-200 px-4 py-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function ActivityLineChart({ data, dataKey = "attempts", xKey = "date" }) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey={xKey} stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                    type="monotone" 
                    dataKey={dataKey} 
                    name={dataKey === "attempts" ? "Attempts" : "Logs"}
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

export function SystemHealthChart({ data }) {
    if (!data || !data.length) return null;
    
    return (
        <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="logs" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}

// Loading skeleton for charts
export function ChartSkeleton({ height = 250 }) {
    return (
        <div 
            className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg"
            style={{ height }}
        />
    );
}