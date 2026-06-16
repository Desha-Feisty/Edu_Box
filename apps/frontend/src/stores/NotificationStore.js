import { create } from "zustand";
import axios from "axios";
import useAuthStore from "./Authstore.js";

const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    fetchNotifications: async () => {
        // Prevent overlapping requests
        if (get().loading) return;
        
        const token = useAuthStore.getState().token;
        if (!token) return;
        
        set({ loading: true });
        try {
            const response = await axios.get("/api/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({
                notifications: response.data.notifications,
                unreadCount: response.data.unreadCount,
                loading: false,
            });
        } catch (error) {
            console.error("Fetch notifications error:", error);
            set({ loading: false });
        }
    },

    markAsRead: async (id) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) return;

            await axios.patch(`/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const current = get().notifications;
            const updated = current.map((n) =>
                String(n._id) === String(id) ? { ...n, read: true } : n,
            );
            const newUnreadCount = updated.filter((n) => !n.read).length;

            set({ notifications: updated, unreadCount: newUnreadCount });
        } catch (error) {
            console.error("Mark read error:", error.response?.data || error.message);
        }
    },

    markAllAsRead: async () => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) return;

            await axios.post("/api/notifications/read-all", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updated = get().notifications.map((n) => ({
                ...n,
                read: true,
            }));
            set({ notifications: updated, unreadCount: 0 });
        } catch (error) {
            console.error("Mark all read error:", error.response?.data || error.message);
        }
    },

    // To be called when a real-time event arrives
    addNotification: (notification) => {
        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 20),
            unreadCount: state.unreadCount + 1,
        }));
    },

    deleteNotification: async (id) => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) return;

            await axios.delete(`/api/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const current = get().notifications;
            const deleted = current.find((n) => String(n._id) === String(id));
            const updated = current.filter((n) => String(n._id) !== String(id));
            const newUnreadCount = updated.filter((n) => !n.read).length;

            set({ 
                notifications: updated, 
                unreadCount: deleted && !deleted.read ? newUnreadCount : get().unreadCount 
            });
        } catch (error) {
            console.error("Delete notification error:", error.response?.data || error.message);
        }
    },
}));

export default useNotificationStore;