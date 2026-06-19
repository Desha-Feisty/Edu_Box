import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/Authstore";
import axios from "axios";
import toast from "react-hot-toast";
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

    const fetchTickets = useCallback(async () => {
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
    }, [token]);

     
    useEffect(() => {
        if (activeTab === "support") {
            fetchTickets();
        }
    }, [activeTab, fetchTickets]);

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
                `/api/tickets/${ticketId}`,
                { status: "closed" },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Ticket closed");
            fetchTickets();
        } catch {
            toast.error("Failed to close ticket");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "open":
                return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
            case "in-progress":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
            case "closed":
                return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "security", label: "Security", icon: Lock },
        { id: "support", label: "Support", icon: MessageSquare },
    ];

    return (
            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                        Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage your account preferences and support tickets
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 shrink-0">
                        <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-2 flex flex-col gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                                        activeTab === tab.id
                                        ? "bg-brand-600 text-white shadow-lg shadow-brand-700/25"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-300"
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
                        {activeTab === "profile" && (
                            <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 sm:p-8">
                                <h2 className="text-xl font-bold mb-6">Profile Information</h2>
                                <div className="space-y-4">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold">Full Name</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.name}
                                            readOnly
                                            className="input input-bordered bg-slate-50 dark:bg-base-300 cursor-not-allowed"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1 px-1">
                                            * To change your name, please contact the administrator
                                        </p>
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold">Email Address</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={profileData.email}
                                            readOnly
                                            className="input input-bordered bg-slate-50 dark:bg-base-300 cursor-not-allowed"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1 px-1">
                                            * Email address cannot be changed
                                        </p>
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold">Role</span>
                                        </label>
                                        <div className="capitalize px-4 py-3 bg-slate-100 dark:bg-base-300 rounded-xl font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            {role}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "security" && (
                            <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 sm:p-8">
                                <h2 className="text-xl font-bold mb-6">Security Settings</h2>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        toast.error("Password change functionality is currently disabled");
                                    }}
                                    className="space-y-4"
                                >
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold">Current Password</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={passwordData.currentPassword}
                                                onChange={(e) =>
                                                    setPasswordData({
                                                        ...passwordData,
                                                        currentPassword: e.target.value,
                                                    })
                                                }
                                                className="input input-bordered w-full pr-12"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="w-5 h-5" />
                                                ) : (
                                                    <Eye className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold">New Password</span>
                                        </label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={passwordData.newPassword}
                                            onChange={(e) =>
                                                setPasswordData({
                                                    ...passwordData,
                                                    newPassword: e.target.value,
                                                })
                                            }
                                            className="input input-bordered w-full"
                                            placeholder="Min. 8 characters"
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-bold">Confirm New Password</span>
                                        </label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={passwordData.confirmPassword}
                                            onChange={(e) =>
                                                setPasswordData({
                                                    ...passwordData,
                                                    confirmPassword: e.target.value,
                                                })
                                            }
                                            className="input input-bordered w-full"
                                            placeholder="Re-type new password"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                className="btn-brand w-full"
                            >
                                <Save className="w-5 h-5" />
                                Update Password
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === "support" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* Create Ticket */}
                                <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 sm:p-8">
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                        <Plus className="w-5 h-5 text-brand-600" />
                                        Create Support Ticket
                                    </h2>
                                    <form onSubmit={handleSubmitTicket} className="space-y-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Subject</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={newTicket.subject}
                                                onChange={(e) =>
                                                    setNewTicket({
                                                        ...newTicket,
                                                        subject: e.target.value,
                                                    })
                                                }
                                                className="input input-bordered"
                                                placeholder="Brief summary of the issue"
                                                required
                                            />
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Message</span>
                                            </label>
                                            <textarea
                                                value={newTicket.message}
                                                onChange={(e) =>
                                                    setNewTicket({
                                                        ...newTicket,
                                                        message: e.target.value,
                                                    })
                                                }
                                                className="textarea textarea-bordered h-32"
                                                placeholder="Provide detailed information..."
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmittingTicket}
                                        className="btn-brand w-full"
                                    >
                                        {isSubmittingTicket ? (
                                            <span className="loading loading-spinner loading-sm"></span>
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Submit Ticket
                                        </button>
                                    </form>
                                </div>

                                {/* My Tickets */}
                                <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                        <h2 className="text-xl font-bold">My Tickets</h2>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isLoadingTickets ? (
                                            <div className="p-12 flex justify-center">
                                                <span className="loading loading-spinner loading-md text-blue-600"></span>
                                            </div>
                                        ) : tickets.length === 0 ? (
                                            <div className="p-12 text-center text-slate-500">
                                                No support tickets found
                                            </div>
                                        ) : (
                                            tickets.map((ticket) => (
                                                <div key={ticket._id} className="p-6">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span
                                                                    className={`badge badge-sm py-2.5 px-3 border-none font-bold text-[10px] uppercase ${getStatusColor(
                                                                        ticket.status
                                                                    )}`}
                                                                >
                                                                    {ticket.status}
                                                                </span>
                                                                <span className="text-xs text-slate-400 font-medium">
                                                                    ID: #{ticket._id.substring(ticket._id.length - 6)}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                                                {ticket.subject}
                                                            </h3>
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">
                                                        {ticket.message}
                                                    </p>
                                                    {ticket.response && (
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4 border border-blue-100 dark:border-blue-800">
                                                            <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400 font-bold text-xs uppercase">
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                                Official Response
                                                            </div>
                                                            <p className="text-slate-700 dark:text-slate-300 text-sm italic">
                                                                "{ticket.response}"
                                                            </p>
                                                        </div>
                                                    )}
                                                    {ticket.status !== "closed" && (
                                                        <button
                                                            onClick={() => handleCloseTicket(ticket._id)}
                                                            className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            Close Ticket
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
    );
}

export default SettingsPage;