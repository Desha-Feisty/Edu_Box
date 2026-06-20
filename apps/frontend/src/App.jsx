import { lazy, Suspense, useEffect, useRef } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import useAuthStore, { setupAuthInterceptor } from "./stores/Authstore";
import useThemeStore from "./stores/ThemeStore";
import useSocketStore from "./stores/SocketStore";
import useNotificationStore from "./stores/NotificationStore";
import useQuizStore from "./stores/Quizstore";
import useTeacherStore from "./stores/Teacherstore";
import useChatStore from "./stores/ChatStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import ChatWindow from "./components/ChatWindow";
import { LoadingPage } from "./components/common/Loading";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ConnectionStatus from "./components/common/ConnectionStatus";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { useDebouncedCallback } from "./hooks/useDebounce";
import useSocketInvalidation from "./hooks/useSocketInvalidation";
import AdminProvider from "./contexts/AdminContext";

// Regular imports (non-lazy)
import LoginPage from "./pages/LoginPage.jsx";

// Lazy load pages for code splitting
const TeacherCoursePage = lazy(() => import("./pages/TeacherCoursePage.jsx"));
const QuizQuestionsPage = lazy(() => import("./pages/QuizQuestionsPage.jsx"));
const StudentQuizPage = lazy(() => import("./components/StudentQuizPage.jsx"));
const QuizResultsPage = lazy(() => import("./components/QuizResultsPage.jsx"));
const QuizSubmittedPage = lazy(() => import("./components/QuizSubmittedPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const NoteDetail = lazy(() => import("./components/NoteDetail.jsx"));

// Admin pages - lazy loaded
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics.jsx"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs.jsx"));
const AdminTickets = lazy(() => import("./pages/admin/AdminTickets.jsx"));

// New pages - lazy loaded
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard.jsx"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard.jsx"));
const StudentCoursesPage = lazy(() => import("./pages/StudentCoursesPage.jsx"));
const StudentQuizzesPage = lazy(() => import("./pages/StudentQuizzesPage.jsx"));
const StudentGradesPage = lazy(() => import("./pages/StudentGradesPage.jsx"));
const StudentCalendarPage = lazy(() => import("./pages/StudentCalendarPage.jsx"));
const TeacherCoursesPage = lazy(() => import("./pages/TeacherCoursesPage.jsx"));
const TeacherChatsPage = lazy(() => import("./pages/TeacherChatsPage.jsx"));
const TeacherQuizCreatePage = lazy(() => import("./pages/TeacherQuizCreatePage.jsx"));
const TeacherReviewRequestsPage = lazy(() => import("./pages/TeacherReviewRequestsPage.jsx"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));

function SocketListener() {
    const token = useAuthStore((state) => state.token);
    const connect = useSocketStore((state) => state.connect);
    const socket = useSocketStore((state) => state.socket);
    const fetchNotifications = useNotificationStore(
        (state) => state.fetchNotifications,
    );
    const listRecentChats = useTeacherStore((state) => state.listRecentChats);

    // Track processed message IDs per component lifecycle (cleaned up on unmount)
    const processedMessagesRef = useRef(new Set());

    // Debounce updates to avoid 429 errors during message bursts
    const debouncedFetchNotifications = useDebouncedCallback(fetchNotifications, 1000);
    const debouncedListRecentChats = useDebouncedCallback(() => listRecentChats(true), 1000);

    useEffect(() => {
        if (token) {
            connect(token);
        }
    }, [token, connect]);

    // Bridge socket events → TanStack Query cache invalidation
    useSocketInvalidation();

    // Fetch notifications immediately for real-time badge update, except for chat (debounced)
    const fetchNotifsDirect = () => {
        useNotificationStore.getState().fetchNotifications();
    };

    useEffect(() => {
        if (!socket) return;

        socket.on("new-quiz", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            fetchNotifsDirect();
            useQuizStore.getState().fetchAvailableQuizzes();
            toast.success(`New Quiz: ${data.title} in ${data.courseTitle}`, {
                duration: 5000,
                icon: "📝",
            });
        });

        socket.on("new-note", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            fetchNotifsDirect();
            toast.success(`New Note: ${data.title} was posted`, {
                duration: 4000,
                icon: "📖",
            });
        });

        socket.on("chat-message", (message) => {
            const token = useAuthStore.getState().token;
            const currentUser = useAuthStore.getState().user;
            if (!token || !currentUser) return;

            const msgId = message._id || message.id;
            const fallbackId =
                msgId ||
                `${message.text}-${typeof message.sender === "object" ? message.sender._id || message.sender.id : message.sender}`;

            const pm = processedMessagesRef.current;
            if (pm.has(fallbackId)) return;
            pm.add(fallbackId);

            if (pm.size > 100) {
                const first = pm.values().next().value;
                pm.delete(first);
            }

            debouncedFetchNotifications();

            if (currentUser.role === "teacher") {
                debouncedListRecentChats();
            }

            const myId = currentUser?.id || currentUser?._id;
            const senderId = message.sender?._id || message.sender;

            if (senderId !== myId) {
                const senderName =
                    typeof message.sender === "object"
                        ? message.sender.name
                        : "Teammate";
                toast(`Message from ${senderName}: ${message.text?.substring(0, 30)}...`, {
                    id: message._id,
                    duration: 3000,
                });
            }
        });

        socket.on("new-ticket", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            fetchNotifsDirect();
            toast.success(`New Support Ticket from ${data.userName}: ${data.subject}`, {
                duration: 5000,
                icon: "🎫",
            });
        });

        socket.on("ticket-response", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            fetchNotifsDirect();
            toast.success(`Ticket Response: ${data.subject}`, {
                duration: 5000,
                icon: "💬",
            });
        });

        socket.on("calendar-event", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            fetchNotifsDirect();
            toast.success(`New Event: ${data.title} in ${data.courseTitle}`, {
                duration: 5000,
                icon: "📅",
            });
        });

        socket.on("calendar-event-updated", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            toast.success(`Event Updated: ${data.title}`, {
                duration: 5000,
                icon: "📅",
            });
        });

        socket.on("calendar-event-deleted", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            toast(`Event Deleted: ${data.title}`, {
                duration: 5000,
                icon: "📅",
            });
        });

        // Quiz-grade notifications
        socket.on("quiz-graded", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            fetchNotifsDirect();
            toast.success(`Grades Released: "${data.quizTitle}"`, {
                duration: 5000,
                icon: "📊",
            });
        });

        socket.on("quiz-missed", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            fetchNotifsDirect();
            toast(`Quiz Closed: "${data.quizTitle}" — you missed it`, {
                duration: 5000,
                icon: "⚠️",
            });
        });

        return () => {
            socket.off("new-quiz");
            socket.off("new-note");
            socket.off("chat-message");
            socket.off("new-ticket");
            socket.off("ticket-response");
            socket.off("calendar-event");
            socket.off("calendar-event-updated");
            socket.off("calendar-event-deleted");
            socket.off("quiz-graded");
            socket.off("quiz-missed");
        };
    }, [socket, debouncedFetchNotifications, debouncedListRecentChats]);

    return null;
}

function ChatWindowWrapper() {
    const activeChat = useChatStore((state) => state.activeChat);
    const closeChat = useChatStore((state) => state.closeChat);

    if (!activeChat) return null;

    return (
        <ChatWindow
            courseId={activeChat.courseId}
            peerId={activeChat.peerId}
            peerName={activeChat.peerName}
            onClose={closeChat}
        />
    );
}

function App() {
    // Set up auth interceptor after React is initialized
    useEffect(() => {
        console.log("🔄 [App.jsx] Setting up auth interceptor...");
        setupAuthInterceptor();
        
        // Initialize theme store after React mounts
        try {
            const { initTheme } = useThemeStore.getState();
            if (initTheme) initTheme();
            console.log("✅ [App.jsx] Theme initialized");
        } catch (err) {
            console.warn("⚠️ [App.jsx] Theme init failed:", err.message);
        }
    }, []);

    // Render app with ErrorBoundary for error handling
    return (
        <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
            <Toaster position="top-right" />
            <SocketListener />
            <ErrorBoundary>
                <Suspense fallback={<LoadingPage />}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Navigate to="/login" />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Authenticated Routes — all share AppLayout */}
                    <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>

                        {/* Student Routes */}
                        <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
                            <Route path="/student" element={<StudentDashboard />} />
                            <Route path="/student/analytics" element={<AnalyticsPage />} />
                            <Route path="/student/courses" element={<StudentCoursesPage />} />
                            <Route path="/student/quizzes" element={<StudentQuizzesPage />} />
                            <Route path="/student/grades" element={<StudentGradesPage />} />
                            <Route path="/student/calendar" element={<StudentCalendarPage />} />
                            <Route path="/student/quiz/:attemptId" element={<StudentQuizPage />} />
                            <Route path="/student/quiz/:attemptId/results" element={<QuizResultsPage />} />
                            <Route path="/student/quiz/:attemptId/submitted" element={<QuizSubmittedPage />} />
                        </Route>

                        {/* Teacher Routes */}
                        <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
                            <Route path="/teacher" element={<TeacherDashboard />} />
                            <Route path="/teacher/analytics" element={<AnalyticsPage />} />
                            <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
                            <Route path="/teacher/chats" element={<TeacherChatsPage />} />
                            <Route path="/teacher/quiz/create" element={<TeacherQuizCreatePage />} />
                            <Route path="/teacher/course/:id" element={<TeacherCoursePage />} />
                            <Route path="/teacher/quiz/:id/questions" element={<QuizQuestionsPage />} />
                            <Route path="/teacher/review-requests" element={<TeacherReviewRequestsPage />} />
                        </Route>

                        {/* Admin Routes */}
                        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                        <Route path="/admin" element={
                            <AdminProvider>
                                <Suspense fallback={<div className="min-h-screen" />}>
                                    <AdminLayout />
                                </Suspense>
                            </AdminProvider>
                        }>
                            <Route index element={<AdminOverview />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="analytics" element={<AdminAnalytics />} />
                            <Route path="logs" element={<AdminLogs />} />
                            <Route path="tickets" element={<AdminTickets />} />
                        </Route>
                        </Route>

                        {/* Shared Routes — any authenticated user */}
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/note/:noteId" element={<NoteDetail />} />
                    </Route>
                    </Route>
                </Routes>
            </Suspense>
            </ErrorBoundary>

            {/* Global Chat Window */}
            <ChatWindowWrapper />
            
            {/* Connection Status - Shows backend availability */}
            <ConnectionStatus />
        </ErrorBoundary>
        </QueryClientProvider>
    );
}

export default App;
