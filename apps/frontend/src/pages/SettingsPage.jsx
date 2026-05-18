import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/Authstore";
import axios from "axios";
import toast from "react-hot-toast";
import PageWrapper from "../components/layout/PageWrapper";
import {
    User,
    Lock,
    MessageSquare,
    Save,
    Eye,
    EyeOff,
    Send,
    Clock,
    CheckCircle,
    AlertCircle,
    Plus,
    X,
} from "lucide-react";

function SettingsPage() {
    const { token, user, role } = useAuthStore();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("profile");
    const [isLoading, setIsLoading] = useState(false);

    // Profile state
    const [profileData] = useState({
        name: user?.name || "",
        email: user?.email || "",
    });

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);

    // Ticket state
    const [tickets, setTickets] = useState([]);
    const [isLoadingTickets, setIsLoadingTickets] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: "", message: "" });
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate("/login");
        }
    }, [token, navigate]);

    useEffect(() => {
        if (activeTab === "support") {
            fetchTickets();
        }
    }, [activeTab]);

    const fetchTickets = async () => {
        setIsLoadingTickets(true);
        try {
            const res = await axios.get("/api/tickets", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(res.data.tickets || []);
        } catch {
            // Silent fail
        } finally {
            setIsLoadingTickets(false);
        }
    };

    const handleSubmitTicket = async (e) => {
        e.preventDefault();
        if (!newTicket.subject.trim() || !newTicket.message.trim()) {
            toast.error("Please fill in all fields");
            return;
        }
        setIsSubmittingTicket(true);
        try {
            await axios.post(
                "/api/tickets",
                { subject: newTicket.subject, message: newTicket.message },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Ticket submitted successfully");
            setNewTicket({ subject: "", message: "" });
            fetchTickets();
        } catch (err) {
            toast.error(err.response?.data?.errMsg || "Failed to submit ticket");
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const handleCloseTicket = async (ticketId) => {
        try {
            await axios.patch(
                `/api/tickets/${ticketId}/close`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Ticket closed successfully");
            fetchTickets();
        } catch (err) {
            toast.error(err.response?.data?.errMsg || "Failed to close ticket");
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        setIsLoading(true);
        try {
            await axios.put(
                "/api/auth/password",
                {
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Password changed successfully");
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast.error(err.response?.data?.errMsg || "Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "password", label: "Password", icon: Lock },
        { id: "support", label: "Support", icon: MessageSquare },
    ];

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    return (
        <PageWrapper>
            <main className="max-w-4xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Manage your account
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar Tabs */}
                    <div className="md:w-64 shrink-0">
                        <div className="glass-panel rounded-2xl p-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                                        activeTab === tab.id
                                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1">
                        <div className="glass-panel rounded-2xl p-6">
                            {activeTab === "profile" && (
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <User className="w-5 h-5 text-blue-500" />
                                        Profile Information
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Full Name</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered rounded-xl bg-slate-100 dark:bg-slate-800"
                                                value={profileData.name}
                                                disabled
                                            />
                                            <label className="label">
                                                <span className="label-text-alt text-slate-500">
                                                    Contact your administrator to change your name
                                                </span>
                                            </label>
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Email Address</span>
                                            </label>
                                            <input
                                                type="email"
                                                className="input input-bordered rounded-xl bg-slate-100 dark:bg-slate-800"
                                                value={profileData.email}
                                                disabled
                                            />
                                            <label className="label">
                                                <span className="label-text-alt text-slate-500">
                                                    Email cannot be changed
                                                </span>
                                            </label>
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Role</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered rounded-xl bg-slate-100 dark:bg-slate-800 capitalize"
                                                value={role}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "password" && (
                                <form onSubmit={handlePasswordChange}>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-blue-500" />
                                        Change Password
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Current Password</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className="input input-bordered rounded-xl w-full pr-10"
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) =>
                                                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                                                    }
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">New Password</span>
                                            </label>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="input input-bordered rounded-xl"
                                                value={passwordData.newPassword}
                                                onChange={(e) =>
                                                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                                                }
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Confirm New Password</span>
                                            </label>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="input input-bordered rounded-xl"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) =>
                                                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn btn-primary rounded-xl mt-6"
                                    >
                                        <Lock className="w-5 h-5 mr-2" />
                                        {isLoading ? "Changing..." : "Change Password"}
                                    </button>
                                </form>
                            )}

                            {activeTab === "support" && (
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-blue-500" />
                                        Submit Support Ticket
                                    </h2>
                                    <form onSubmit={handleSubmitTicket} className="space-y-4 mb-8">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Subject</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered rounded-xl"
                                                value={newTicket.subject}
                                                onChange={(e) =>
                                                    setNewTicket({ ...newTicket, subject: e.target.value })
                                                }
                                                placeholder="Brief description of your issue"
                                                required
                                            />
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Message</span>
                                            </label>
                                            <textarea
                                                className="textarea textarea-bordered rounded-xl h-32"
                                                value={newTicket.message}
                                                onChange={(e) =>
                                                    setNewTicket({ ...newTicket, message: e.target.value })
                                                }
                                                placeholder="Describe your issue in detail..."
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmittingTicket}
                                            className="btn btn-primary rounded-xl"
                                        >
                                            <Send className="w-5 h-5 mr-2" />
                                            {isSubmittingTicket ? "Submitting..." : "Submit Ticket"}
                                        </button>
                                    </form>

                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Clock className="w-5 h-5" />
                                        Your Tickets
                                    </h3>
                                    {isLoadingTickets ? (
                                        <div className="text-center py-8">
                                            <span className="loading loading-spinner"></span>
                                        </div>
                                    ) : tickets.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                            No tickets submitted yet
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {tickets.map((ticket) => (
                                                <div
                                                    key={ticket._id}
                                                    className="p-4 bg-slate-50 dark:bg-base-300/50 rounded-xl"
                                                >
                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {ticket.subject}
                                                            </p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                                {ticket.message}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {ticket.status === "open" && (
                                                                <button
                                                                    onClick={() => handleCloseTicket(ticket._id)}
                                                                    className="btn btn-ghost btn-xs btn-circle"
                                                                    title="Close ticket"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <span
                                                                className={`badge badge-sm ${
                                                                    ticket.status === "open"
                                                                        ? "badge-warning"
                                                                        : "badge-success"
                                                                }`}
                                                            >
                                                                {ticket.status === "open" ? (
                                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                                ) : (
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                )}
                                                                {ticket.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-slate-400 dark:text-slate-500">
                                                        {formatDate(ticket.createdAt)}
                                                    </div>
                                                    {ticket.adminReply && (
                                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                Admin Response:
                                                            </p>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                                {ticket.adminReply}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </PageWrapper>
    );
}

export default SettingsPage;