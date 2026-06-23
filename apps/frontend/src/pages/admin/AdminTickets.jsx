import { useState, useEffect } from "react";
import axios from "axios";
import useAuthStore from "../../stores/Authstore";
import toast from "react-hot-toast";
import {
    MessageSquare,
    Clock,
    CheckCircle,
    AlertCircle,
    Send,
    User,
    X,
    Filter,
} from "lucide-react";

function AdminTickets() {
    const { token } = useAuthStore();
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [respondingTo, setRespondingTo] = useState(null);
    const [adminReply, setAdminReply] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get("/api/tickets/all", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(res.data.tickets || []);
        } catch (_err) {
            toast.error("Failed to fetch tickets");
        } finally {
            setIsLoading(false);
        }
    };

     
    useEffect(() => {
        if (token) {
            fetchTickets();
        }
    }, [token]);

    const handleRespond = async (ticketId) => {
        if (!adminReply.trim()) {
            toast.error("Please enter a response");
            return;
        }
        try {
            await axios.patch(
                `/api/tickets/${ticketId}/respond`,
                { adminReply },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Response sent successfully");
            setRespondingTo(null);
            setAdminReply("");
            // Update selectedTicket optimistically so the reply shows immediately
            const replyText = adminReply.trim();
            setSelectedTicket((prev) =>
                prev?._id === ticketId ? { ...prev, adminReply: replyText } : prev
            );
            setTickets((prev) =>
                prev.map((t) =>
                    t._id === ticketId ? { ...t, adminReply: replyText } : t
                )
            );
            fetchTickets(); // background refresh
        } catch (err) {
            toast.error(err.response?.data?.errMsg || "Failed to send response");
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
            if (selectedTicket?._id === ticketId) {
                setSelectedTicket((prev) => ({ ...prev, status: "closed" }));
            }
        } catch (err) {
            toast.error(err.response?.data?.errMsg || "Failed to close ticket");
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const filteredTickets = tickets.filter((ticket) => {
        if (statusFilter === "all") return true;
        return ticket.status === statusFilter;
    });

    return (
        <main className="h-full animate-in fade-in duration-500">
            <div className="h-full flex gap-4">
                    {/* Sidebar - Ticket List */}
                    <div className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-base-200 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-blue-500" />
                                Tickets
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {tickets.length} total tickets
                            </p>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setStatusFilter("all")}
                                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                                    statusFilter === "all"
                                        ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setStatusFilter("open")}
                                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                                    statusFilter === "open"
                                        ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                }`}
                            >
                                Open
                            </button>
                            <button
                                onClick={() => setStatusFilter("closed")}
                                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                                    statusFilter === "closed"
                                        ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                }`}
                            >
                                Closed
                            </button>
                        </div>

                        {/* Ticket List */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <span className="loading loading-spinner loading-md text-blue-500"></span>
                                </div>
                            ) : filteredTickets.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No tickets</p>
                                </div>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <button
                                        key={ticket._id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                            selectedTicket?._id === ticket._id
                                                ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                                                : ""
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <span
                                                className={`badge badge-sm ${
                                                    ticket.status === "open"
                                                        ? "badge-warning"
                                                        : "badge-success"
                                                }`}
                                            >
                                                {ticket.status}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {formatDate(ticket.createdAt)}
                                            </span>
                                        </div>
                                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                                            {ticket.subject}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                                            {ticket.user?.name || "Unknown"}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Center Panel - Ticket Detail */}
                    <div className="flex-1 bg-white dark:bg-base-200 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {selectedTicket ? (
                            <div className="h-full flex flex-col">
                                {/* Detail Header */}
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {selectedTicket.user?.name || "Unknown User"}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {selectedTicket.user?.email}
                                                </p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                    {selectedTicket.user?.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`badge ${
                                                    selectedTicket.status === "open"
                                                        ? "badge-warning"
                                                        : "badge-success"
                                                }`}
                                            >
                                                {selectedTicket.status === "open" ? (
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                ) : (
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                )}
                                                {selectedTicket.status}
                                            </span>
                                            {selectedTicket.status === "open" && (
                                                <button
                                                    onClick={() => handleCloseTicket(selectedTicket._id)}
                                                    className="btn btn-sm btn-outline border-slate-200 dark:border-slate-700 rounded-xl"
                                                    title="Close ticket"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Content */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                        {selectedTicket.subject}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-wrap">
                                        {selectedTicket.message}
                                    </p>

                                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-6">
                                        <Clock className="w-3 h-3" />
                                        Created: {formatDate(selectedTicket.createdAt)}
                                    </div>

                                    {/* Admin Reply */}
                                    {selectedTicket.adminReply && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                Admin Response:
                                            </p>
                                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                                    {selectedTicket.adminReply}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Response Form */}
                                    {selectedTicket.status === "open" && !respondingTo && (
                                        <button
                                            onClick={() => setRespondingTo(selectedTicket._id)}
                                            className="btn btn-brand btn-sm mt-6"
                                        >
                                            <Send className="w-4 h-4 mr-2" />
                                            Respond
                                        </button>
                                    )}

                                    {respondingTo === selectedTicket._id && (
                                        <div className="mt-6">
                                            <textarea
                                                className="textarea textarea-bordered rounded-xl w-full h-32"
                                                placeholder="Type your response..."
                                                value={adminReply}
                                                onChange={(e) =>
                                                    setAdminReply(e.target.value)
                                                }
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() =>
                                                        handleRespond(selectedTicket._id)
                                                    }
                                                    className="btn btn-brand btn-sm"
                                                >
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Send Response
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setRespondingTo(null);
                                                        setAdminReply("");
                                                    }}
                                                    className="btn btn-ghost btn-sm rounded-xl"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                                <div className="text-center">
                                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>Select a ticket to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
        </main>
    );
}

export default AdminTickets;