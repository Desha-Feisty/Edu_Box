import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import useAuthStore, { setupAuthInterceptor } from "./stores/Authstore";
import useThemeStore from "./stores/ThemeStore";
import useSocketStore from "./stores/SocketStore";
import useNotificationStore from "./stores/NotificationStore";
import useQuizStore from "./stores/Quizstore";
import useTeacherStore from "./stores/Teacherstore";
import useChatStore from "./stores/ChatStore";
import ChatWindow from "./components/ChatWindow";
import { LoadingPage } from "./components/common/Loading";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AppLayout from "./components/layout/AppLayout";
import { useDebouncedCallback } from "./hooks/useDebounce";
import { AdminProvider } from "./contexts/AdminContext";

// Regular imports (non-lazy)
import LoginPage from "./pages/LoginPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";

// Lazy load pages for code splitting
const StudentPage = lazy(() => import("./pages/StudentPage.jsx"));
const TeacherPage = lazy(() => import("./pages/TeacherPage.jsx"));
const TeacherCoursePage = lazy(() => import("./pages/TeacherCoursePage.jsx"));
const QuizQuestionsPage = lazy(() => import("./pages/QuizQuestionsPage.jsx"));
const StudentQuizPage = lazy(() => import("./components/StudentQuizPage.jsx"));
const QuizResultsPage = lazy(() => import("./components/QuizResultsPage.jsx"));
const QuizSubmittedPage = lazy(() => import("./components/QuizSubmittedPage.jsx"));
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
const StudentCoursesPage = lazy(() => import("./pages/StudentCoursesPage.jsx"));
const StudentQuizzesPage = lazy(() => import("./pages/StudentQuizzesPage.jsx"));
const StudentGradesPage = lazy(() => import("./pages/StudentGradesPage.jsx"));
const StudentCalendarPage = lazy(() => import("./pages/StudentCalendarPage.jsx"));
const TeacherCoursesPage = lazy(() => import("./pages/TeacherCoursesPage.jsx"));
const TeacherQuizCreatePage = lazy(() => import("./pages/TeacherQuizCreatePage.jsx"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));

const processedMessages = new Set();

function SocketListener() {
    const token = useAuthStore((state) => state.token);
    const connect = useSocketStore((state) => state.connect);
    const socket = useSocketStore((state) => state.socket);
    const fetchNotifications = useNotificationStore(
        (state) => state.fetchNotifications,
    );
    const listRecentChats = useTeacherStore((state) => state.listRecentChats);

    // Debounce updates to avoid 429 errors during message bursts
    const debouncedFetchNotifications = useDebouncedCallback(fetchNotifications, 1000);
    const debouncedListRecentChats = useDebouncedCallback(() => listRecentChats(true), 1000);

    useEffect(() => {
        if (token) {
            connect(token);
        }
    }, [token, connect]);

    useEffect(() => {
        if (!socket) return;

        socket.on("new-quiz", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            debouncedFetchNotifications();
            useQuizStore.getState().fetchAvailableQuizzes();
            toast.success(`New Quiz: ${data.title} in ${data.courseTitle}`, {
                duration: 5000,
                icon: "📝",
            });
        });

        socket.on("new-note", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            debouncedFetchNotifications();
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

            if (processedMessages.has(fallbackId)) return;
            processedMessages.add(fallbackId);

            if (processedMessages.size > 100) {
                const first = processedMessages.values().next().value;
                processedMessages.delete(first);
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
            debouncedFetchNotifications();
            toast.success(`New Support Ticket from ${data.userName}: ${data.subject}`, {
                duration: 5000,
                icon: "🎫",
            });
        });

        socket.on("ticket-response", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            debouncedFetchNotifications();
            toast.success(`Ticket Response: ${data.subject}`, {
                duration: 5000,
                icon: "💬",
            });
        });

        socket.on("calendar-event", (data) => {
            const token = useAuthStore.getState().token;
            if (!token) return;
            debouncedFetchNotifications();
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

        return () => {
            socket.off("new-quiz");
            socket.off("new-note");
            socket.off("chat-message");
            socket.off("new-ticket");
            socket.off("ticket-response");
            socket.off("calendar-event");
            socket.off("calendar-event-updated");
            socket.off("calendar-event-deleted");
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
        setupAuthInterceptor();
        
        // Initialize theme store after React mounts
        try {
            const { initTheme } = useThemeStore.getState();
            if (initTheme) initTheme();
        } catch {
            // Silent theme init fail
        }
    }, []);

    return (
        <ErrorBoundary>
            <Toaster position="top-right" />
            <SocketListener />
            <Suspense fallback={<LoadingPage />}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Navigate to="/login" />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Student Routes with App Layout */}
                    <Route element={<AppLayout />}>
                        {/* Dashboard - Rich widgets */}
                        <Route path="/student" element={<DashboardPage />} />
                        <Route path="/student/analytics" element={<AnalyticsPage />} />

                        {/* Standalone Pages */}
                        <Route path="/student/courses" element={<StudentCoursesPage />} />
                        <Route path="/student/quizzes" element={<StudentQuizzesPage />} />
                        <Route path="/student/grades" element={<StudentGradesPage />} />
                        <Route path="/student/calendar" element={<StudentCalendarPage />} />
                        <Route path="/student/quiz/:attemptId" element={<StudentQuizPage />} />
                        <Route path="/student/quiz/:attemptId/results" element={<QuizResultsPage />} />
                        <Route path="/student/quiz/:attemptId/submitted" element={<QuizSubmittedPage />} />
                        <Route path="/note/:noteId" element={<NoteDetail />} />
                    </Route>

                    {/* Teacher Routes with App Layout */}
                    <Route element={<AppLayout />}>
                        {/* Dashboard - Rich widgets */}
                        <Route path="/teacher" element={<DashboardPage />} />
                        <Route path="/teacher/analytics" element={<AnalyticsPage />} />

                        {/* Standalone Pages */}
                        <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
                        <Route path="/teacher/quiz/create" element={<TeacherQuizCreatePage />} />
                        <Route path="/teacher/course/:id" element={<TeacherCoursePage />} />
                        <Route path="/teacher/quiz/:id/questions" element={<QuizQuestionsPage />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route element={<AppLayout />}>
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

                    {/* Shared Routes */}
                    <Route element={<AppLayout />}>
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </Suspense>

            {/* Global Chat Window */}
            <ChatWindowWrapper />
        </ErrorBoundary>
    );
}

export default App;
