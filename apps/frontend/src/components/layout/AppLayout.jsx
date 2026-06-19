import { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import useAuthStore from "../../stores/Authstore";
import useUIStore from "../../stores/uiStore";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import NotificationCenter from "../notifications/NotificationCenter";
import PageWrapper from "./PageWrapper";

function AppLayout() {
    const { token } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(
        typeof window !== "undefined" && window.innerWidth >= 1280,
    );
    const isSidebarPinned = useUIStore((s) => s.isSidebarPinned);

    // Track viewport for pinned sidebar
    useEffect(() => {
        const check = () => setIsDesktop(window.innerWidth >= 1280);
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Unpin sidebar when viewport shrinks below desktop
    useEffect(() => {
        if (!isDesktop && isSidebarPinned) {
            useUIStore.getState().setSidebarPinned(false);
        }
    }, [isDesktop, isSidebarPinned]);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const showPinnedSidebar = isDesktop && isSidebarPinned;

    return (
        <PageWrapper>
            {/* Fixed Navbar */}
            <Navbar
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                pinnedSidebarActive={showPinnedSidebar}
            />

            {/* Pinned Sidebar (persistent, on desktop) or Slide-out */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                pinned={showPinnedSidebar}
            />

            {/* Page Content — adjusts for pinned sidebar */}
            <main className={
                `relative z-10 flex-1 pt-16 px-4 md:px-6 lg:px-8 pb-10 max-w-screen-2xl w-full mx-auto transition-all duration-300 ${
                    showPinnedSidebar ? "ml-0 xl:ml-64" : ""
                }`
            }>
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
