import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import useAuthStore from "../../stores/Authstore";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import NotificationCenter from "../notifications/NotificationCenter";
import PageWrapper from "./PageWrapper";

function AppLayout() {
    const { token } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return (
        <PageWrapper>
            {/* Fixed Navbar */}
            <Navbar
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
            />

            {/* Slide-out Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Page Content — top padding for fixed navbar */}
            <main className="relative z-10 flex-1 pt-20 px-4 md:px-6 lg:px-8 pb-10 max-w-screen-2xl w-full mx-auto">
                <Outlet />
            </main>

            {/* Notification Slide-in Panel */}
            <NotificationCenter
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
            />
        </PageWrapper>
    );
}

export default AppLayout;
