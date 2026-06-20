import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle common errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 errors globally
        if (error.response?.status === 401) {
            const isExplicitLogout = localStorage.getItem("isExplicitLogout") === "true";

            if (!isExplicitLogout) {
                const details = error.response?.data?.details;
                const errMsg = error.response?.data?.errMsg;

                if (details === "jwt expired" || errMsg === "unable to verify user") {
                    // Token expired - try to refresh
                    return handleTokenRefresh(error);
                }
            }

            // Clear auth and redirect to login
            localStorage.removeItem("auth-storage");
            localStorage.removeItem("token");
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

// Handle token refresh
async function handleTokenRefresh(originalError) {
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
        try {
            const response = await axios.post("/api/auth/refresh", { refreshToken });
            const { token, refreshToken: newRefreshToken } = response.data.data;

            localStorage.setItem("token", token);
            localStorage.setItem("refreshToken", newRefreshToken);

            // Retry original request
            originalError.config.headers.Authorization = `Bearer ${token}`;
            return axios(originalError.config);
        } catch {
            // Refresh failed - logout
            localStorage.removeItem("auth-storage");
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            window.location.href = "/login";
        }
    }

    return Promise.reject(originalError);
}

// Auth API
export const authApi = {
    login: (email, password) => api.post("/auth/login", { email, password }),
    register: (data) => api.post("/auth/register", data),
    logout: () => api.post("/auth/logout"),
    me: () => api.get("/auth/me"),
    refresh: (refreshToken) => api.post("/auth/refresh", { refreshToken }),
};

// Courses API
export const coursesApi = {
    list: (params) => api.get("/courses", { params }),
    get: (id) => api.get(`/courses/${id}`),
    create: (data) => api.post("/courses", data),
    update: (id, data) => api.put(`/courses/${id}`, data),
    delete: (id) => api.delete(`/courses/${id}`),
    join: (joinCode) => api.post("/courses/join", { joinCode }),
    getStudents: (id) => api.get(`/courses/${id}/students`),
};

// Quizzes API
export const quizzesApi = {
    list: (params) => api.get("/quizzes", { params }),
    get: (id) => api.get(`/quizzes/${id}`),
    create: (data) => api.post("/quizzes", data),
    update: (id, data) => api.put(`/quizzes/${id}`, data),
    delete: (id) => api.delete(`/quizzes/${id}`),
    submit: (id, data) => api.post(`/quizzes/${id}/submit`, data),
    getAttempts: (id) => api.get(`/quizzes/${id}/attempts`),
};

// Questions API
export const questionsApi = {
    list: (quizId) => api.get("/questions", { params: { quizId } }),
    create: (data) => api.post("/questions", data),
    update: (id, data) => api.put(`/questions/${id}`, data),
    delete: (id) => api.delete(`/questions/${id}`),
};

// Attempts API
export const attemptsApi = {
    list: (params) => api.get("/attempts", { params }),
    get: (id) => api.get(`/attempts/${id}`),
};

// Notes API
export const notesApi = {
    list: (params) => api.get("/notes", { params }),
    get: (id) => api.get(`/notes/${id}`),
    create: (data) => api.post("/notes", data),
    update: (id, data) => api.put(`/notes/${id}`, data),
    delete: (id) => api.delete(`/notes/${id}`),
};

// Chat API
export const chatApi = {
    list: (courseId) => api.get("/chats", { params: { courseId } }),
    send: (data) => api.post("/chats", data),
};

// Analytics API
export const analyticsApi = {
    overview: () => api.get("/analytics/overview"),
    course: (id) => api.get(`/analytics/course/${id}`),
};

// Leaderboard API
export const leaderboardApi = {
    get: (courseId) => api.get("/leaderboard", { params: { courseId } }),
};

// Notifications API
export const notificationsApi = {
    list: () => api.get("/notifications"),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put("/notifications/read-all"),
};

// Admin API
export const adminApi = {
    listUsers: (params) => api.get("/admin/users", { params }),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

// ============================================
// API Health Check & Demo Mode
// ============================================

let _isBackendAvailable = null;
let _isCheckingBackend = false;

/**
 * Check if backend API is available
 * Returns cached result to avoid multiple checks
 */
export async function checkBackendHealth() {
    if (_isCheckingBackend) {
        // Wait for ongoing check to complete
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (!_isCheckingBackend) {
                    clearInterval(checkInterval);
                    resolve(_isBackendAvailable);
                }
            }, 100);
        });
    }

    if (_isBackendAvailable !== null) {
        return _isBackendAvailable;
    }

    _isCheckingBackend = true;
    console.log("🔍 [api.js] Checking backend availability...");

    try {
        // Try to hit a simple endpoint
        await api.get("/health", { timeout: 5000 });
        _isBackendAvailable = true;
        console.log("✅ [api.js] Backend is available");
    } catch (error) {
        // Any error means backend is not available
        _isBackendAvailable = false;
        console.warn("⚠️ [api.js] Backend not available:", error.message);
    }

    _isCheckingBackend = false;
    return _isBackendAvailable;
}

/**
 * Get current backend availability status
 */
export function getBackendStatus() {
    return _isBackendAvailable;
}

/**
 * Reset backend status (for testing or reconnection)
 */
export function resetBackendStatus() {
    _isBackendAvailable = null;
    _isCheckingBackend = false;
}

// Demo mode data
export const demoData = {
    user: {
        _id: "demo-user-1",
        name: "Demo Student",
        email: "demo@example.com",
        role: "student",
    },
    courses: [
        { _id: "demo-c1", title: "Introduction to React", description: "Learn React basics", enrollmentCount: 25 },
        { _id: "demo-c2", title: "Advanced JavaScript", description: "Master JS", enrollmentCount: 18 },
        { _id: "demo-c3", title: "Web Development", description: "Full stack development", enrollmentCount: 32 },
    ],
    quizzes: [
        { _id: "demo-q1", title: "React Basics Quiz", timingStatus: "open", isAttempted: false },
        { _id: "demo-q2", title: "JavaScript Fundamentals", timingStatus: "open", isAttempted: false },
    ],
    grades: [
        { _id: "demo-g1", quizTitle: "React Basics Quiz", score: 85, status: "graded" },
        { _id: "demo-g2", quizTitle: "JavaScript Fundamentals", score: 92, status: "graded" },
    ],
};

export default api;