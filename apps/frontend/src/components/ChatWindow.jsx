import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import useAuthStore from "../stores/Authstore";
import useSocketStore from "../stores/SocketStore";

function ChatWindow({ courseId, peerId, peerName, onClose }) {
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const userId = user?.id || user?._id;
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const messagesContainerRef = useRef(null);
    const socket = useSocketStore((state) => state.socket);
    const setSocket = useSocketStore((state) => state.connect);
    const isConnected = useSocketStore((state) => state.isConnected);
    const status = isConnected ? "connected" : "connecting";

    const scrollToBottom = (smooth = true) => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: smooth ? "smooth" : "instant",
            });
        }
    };

    useEffect(() => {
        if (!token) return;
        if (!socket) {
            setSocket(token);
        }
    }, [token, socket, setSocket]);

    useEffect(() => {
        if (!socket || !courseId || !peerId) return;

        socket.emit("join-chat", { courseId, peerId });

        const onHistory = ({ messages: history }) => {
            setMessages(history || []);
            setTimeout(() => scrollToBottom(false), 0);
        };

        const onMessage = (message) => {
            setMessages((prev) => {
                // Deduplicate by ID
                const msgId = message._id || message.id;
                if (msgId && prev.some((m) => (m._id || m.id) === msgId)) {
                    return prev;
                }
                
                // Fallback deduplication: same text and sender within 2 seconds
                const now = new Date(message.createdAt || Date.now()).getTime();
                const isDuplicate = prev.some((m) => {
                    if (m.text !== message.text) return false;
                    const mSender = typeof m.sender === 'object' ? m.sender._id || m.sender.id : m.sender;
                    const msgSender = typeof message.sender === 'object' ? message.sender._id || message.sender.id : message.sender;
                    if (mSender !== msgSender) return false;
                    const mTime = new Date(m.createdAt || Date.now()).getTime();
                    return Math.abs(now - mTime) < 2000;
                });
                
                if (isDuplicate) return prev;

                return [...prev, message];
            });
        };

        socket.on("chat-history", onHistory);
        socket.on("chat-message", onMessage);

        return () => {
            socket.off("chat-history", onHistory);
            socket.off("chat-message", onMessage);
        };
    }, [socket, courseId, peerId]);

    useEffect(() => {
        scrollToBottom(true);
    }, [messages]);

    const handleSend = () => {
        if (!text.trim()) return;
        if (!socket) return;

        socket.emit("send-chat-message", {
            courseId,
            recipientId: peerId,
            text: text.trim(),
        });
        setText("");
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none mb-14 sm:mb-0">
            <div className="w-[350px] h-[70vh] max-h-[500px] rounded-2xl bg-white dark:bg-base-200 border border-slate-200/60 dark:border-white/[0.06] overflow-hidden pointer-events-auto flex flex-col">
                <div className="flex items-center justify-between gap-4 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Chat with {peerName || "Teacher"}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {status === "connected"
                                ? "Connected"
                                : "Connecting..."}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-ghost btn-circle btn-sm text-slate-600 dark:text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div 
                    ref={messagesContainerRef}
                    className="flex-1 min-h-0 max-h-[calc(70vh-140px)] overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/50 dark:bg-base-200/50 backdrop-blur-sm"
                >
                    {messages.length === 0 ? (
                        <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-20">
                            No messages yet. Start the conversation.
                        </div>
                    ) : (
                        messages.map((message) => {
                            const messageSenderId =
                                typeof message.sender === "object"
                                    ? message.sender._id || message.sender.id
                                    : message.sender;
                            const isMine = messageSenderId === userId;
                            return (
                                <div
                                    key={
                                        message._id ||
                                        `${messageSenderId}-${message.createdAt}`
                                    }
                                    className={`flex ${isMine ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${isMine ? "bg-blue-600 text-white rounded-br-none" : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-bl-none"}`}
                                    >
                                        <div className={`text-xs mb-1 ${isMine ? "text-blue-200" : "text-slate-500 dark:text-slate-400"}`}>
                                            {isMine
                                                ? "You"
                                                : message.sender?.name ||
                                                  peerName}
                                        </div>
                                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                            {message.text}
                                        </div>
                                        <div className={`mt-1 text-[10px] text-right ${isMine ? "text-blue-300" : "text-slate-400 dark:text-slate-500"}`}>
                                            {new Date(
                                                message.createdAt,
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md">
                    <div className="flex gap-2">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            placeholder="Message..."
                            className="textarea textarea-bordered flex-1 min-h-[2.5rem] bg-slate-50 dark:bg-base-300 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 py-2"
                        />
                        <button
                            onClick={handleSend}
                            className="btn-brand btn-circle"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatWindow;
