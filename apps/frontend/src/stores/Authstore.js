import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            setUser: (user) => set({ user }),
            clearUser: () => set({ user: null }),
            role: null,
            setRole: (role) => set({ role }),
            clearRole: () => set({ role: null }),
            token: null,
            setToken: (token) => set({ token }),
            clearToken: () => set({ token: null }),
            isLoggingIn: false,
            setIsLoggingIn: (isLoggingIn) => set({ isLoggingIn }),
            isExplicitLogout: false,
            errMsg: null,
            setErrMsg: (errMsg) => set({ errMsg }),
            clearErrMsg: () => set({ errMsg: null }),
            login: async (email, password) => {
                set({ isLoggingIn: true, errMsg: null, isExplicitLogout: false });
                try {
                    const response = await axios.post("/api/auth/login", {
                        email,
                        password,
                    });
                    if (!response.data.success) {
                        set({
                            isLoggingIn: false,
                            errMsg: response.data.errMsg,
                        });
                        return response.data;
                    }
                    const userData = response.data.data?.user || response.data.user;
                    const loginUser = {
                        ...userData,
                        id: userData?.id || userData?._id?.toString(),
                    };
                    set({ user: loginUser });
                    const token = response.data.data?.token || response.data.token;
                    set({ token });
                    localStorage.setItem("token", token);
                    set({ role: loginUser.role });
                    set({ isLoggingIn: false });
                    set({ errMsg: null });
                    return response.data;
                } catch (error) {
                    const errMsg =
                        error.response?.data?.errMsg ||
                        error.message ||
                        "Login failed";
                    console.error("Login error:", errMsg);
                    set({ isLoggingIn: false, errMsg });
                    return { success: false, errMsg };
                }
            },
            register: async (name, email, password, role) => {
                set({ errMsg: null, isExplicitLogout: false });
                try {
                    const response = await axios.post("/api/auth/register", {
                        name,
                        email,
                        password,
                        role,
                    });
                    return response.data;
                } catch (error) {
                    const errMsg =
                        error.response?.data?.errMsg ||
                        error.message ||
                        "Registration failed";
                    set({ errMsg });
                    return { success: false, errMsg };
                }
            },
            logout: async () => {
                try {
                    await axios.post(
                        "/api/auth/logout",
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${get().token}`,
                            },
                        }
                    );
                } catch (error) {
                    console.error("Logout error:", error);
                }
                set({
                    user: null,
                    token: null,
                    role: null,
                    isExplicitLogout: true,
                    errMsg: null,
                });
            },
            // Calendar Events for Students
            calendarEvents: [],
            setCalendarEvents: (events) => set({ calendarEvents: events }),
            listCourseCalendarEvents: async (courseId) => {
                try {
                    const response = await axios.get(`/api/courses/${courseId}/events`, {
                        headers: { Authorization: `Bearer ${get().token}` },
                    });
                    if (response.status === 200) {
                        return response.data.events || [];
                    }
                    return [];
                } catch (error) {
                    console.error("Failed to fetch calendar events:", error);
                    return [];
                }
            },
            listEnrolledCalendarEvents: async (courseIds) => {
                try {
                    const allEvents = [];
                    for (const courseId of courseIds) {
                        const events = await get().listCourseCalendarEvents(courseId);
                        if (events && events.length > 0) {
                            allEvents.push(...events);
                        }
                    }
                    set({ calendarEvents: allEvents });
                    return allEvents;
                } catch (error) {
                    console.error("Failed to fetch enrolled calendar events:", error);
                    return [];
                }
            },
        }),
        {
            name: "auth-storage",
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                role: state.role,
            }),
        }
    )
);

// Calendar Events for Students
useAuthStore.setState((s) => ({
    calendarEvents: s?.calendarEvents || [],
}));
useAuthStore.setCalendarEvents = (events) => useAuthStore.setState({ calendarEvents: events });
useAuthStore.listCourseCalendarEvents = async (courseId) => {
    try {
        const response = await axios.get(`/api/courses/${courseId}/events`, {
            headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
        });
        if (response.status === 200) {
            return response.data.events || [];
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch calendar events:", error);
        return [];
    }
};
useAuthStore.listEnrolledCalendarEvents = async (courseIds) => {
    try {
        const allEvents = [];
        for (const courseId of courseIds) {
            const events = await useAuthStore.listCourseCalendarEvents(courseId);
            if (events && events.length > 0) {
                allEvents.push(...events);
            }
        }
        useAuthStore.setState({ calendarEvents: allEvents });
        return allEvents;
    } catch (error) {
        console.error("Failed to fetch enrolled calendar events:", error);
        return [];
    }
};

// Setup function for axios interceptor (called from App.jsx)
export const setupAuthInterceptor = () => {
    let interceptorSetup = false;
    if (typeof window !== "undefined" && !interceptorSetup) {
        interceptorSetup = true;
        axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const state = useAuthStore.getState();
                const isExplicitLogout = state.isExplicitLogout;
                if (
                    error.response?.status === 401 &&
                    !isExplicitLogout &&
                    (error.response?.data?.details === "jwt expired" ||
                        error.response?.data?.errMsg === "unable to verify user")
                ) {
                    state.logout();
                    if (
                        typeof window !== "undefined" &&
                        !window.location.pathname.includes("/login")
                    ) {
                        window.location.href = "/login";
                    }
                }
                return Promise.reject(error);
            }
        );
    }
};

export default useAuthStore;