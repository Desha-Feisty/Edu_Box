import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

// ── Query Keys ──────────────────────────────────────────
export const notifKeys = {
    all: ["notifications"],
};

// ── Queries ─────────────────────────────────────────────

/** Fetch notifications for the current user */
export function useNotifications() {
    return useQuery({
        queryKey: notifKeys.all,
        queryFn: async () => {
            const { data } = await axios.get("/api/notifications");
            return {
                notifications: data.notifications ?? data.data ?? [],
                unreadCount: data.unreadCount ?? 0,
            };
        },
        staleTime: 30 * 1000, // 30s — notifications are time-sensitive
        refetchInterval: 60 * 1000, // auto-refresh every minute
    });
}

// ── Mutations ───────────────────────────────────────────

/** Mark a single notification as read */
export function useMarkNotifRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => axios.patch(`/api/notifications/${id}/read`),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: notifKeys.all });
            const prev = qc.getQueryData(notifKeys.all);
            qc.setQueryData(notifKeys.all, (old) => {
                if (!old) return old;
                const notifications = old.notifications.map((n) =>
                    n._id === id ? { ...n, read: true } : n,
                );
                return { ...old, notifications, unreadCount: Math.max(0, old.unreadCount - 1) };
            });
            return { prev };
        },
        onError: (_, __, ctx) => {
            if (ctx?.prev) qc.setQueryData(notifKeys.all, ctx.prev);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: notifKeys.all });
        },
    });
}

/** Mark all notifications as read */
export function useMarkAllNotifsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => axios.post("/api/notifications/read-all"),
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: notifKeys.all });
            const prev = qc.getQueryData(notifKeys.all);
            qc.setQueryData(notifKeys.all, (old) => {
                if (!old) return old;
                return {
                    ...old,
                    notifications: old.notifications.map((n) => ({ ...n, read: true })),
                    unreadCount: 0,
                };
            });
            return { prev };
        },
        onError: (_, __, ctx) => {
            if (ctx?.prev) qc.setQueryData(notifKeys.all, ctx.prev);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: notifKeys.all });
        },
    });
}

/** Delete a notification */
export function useDeleteNotif() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => axios.delete(`/api/notifications/${id}`),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: notifKeys.all });
            const prev = qc.getQueryData(notifKeys.all);
            qc.setQueryData(notifKeys.all, (old) => {
                if (!old) return old;
                const notifications = old.notifications.filter((n) => n._id !== id);
                return { ...old, notifications };
            });
            return { prev };
        },
        onError: (_, __, ctx) => {
            if (ctx?.prev) qc.setQueryData(notifKeys.all, ctx.prev);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: notifKeys.all });
        },
    });
}
