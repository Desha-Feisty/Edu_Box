import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Loader } from "lucide-react";
import ChatConversationItem from "../ChatConversationItem";
import ChatPanel from "../ChatPanel";

/**
 * Shared chat container component extracted from TeacherChatTab and StudentChatsTab.
 *
 * Props:
 *   fetchConversations  – async function that returns an array of normalized conversation
 *                          objects: { id, courseId, peerId, peerName, courseName,
 *                            lastMessage, lastMessageTime, messages }
 *   chatIdScheme        – "mongo" | "composite" — documents how `id` values are generated.
 *                         "mongo"   = MongoDB _id  (used by teacher)
 *                         "composite" = courseId_peerId (used by student)
 *   maxHeight           – CSS height string for the grid container (e.g. "calc(100vh - 250px)")
 *   currentUserId       – string for message ownership checks (consumed by ChatPanel internally)
 *   standalone          – boolean (optional). When true and no maxHeight given, uses a taller
 *                         default height. Default false.
 *   ready               – boolean (optional). When false, the component shows a non-blocking
 *                         initial state and does not call fetchConversations. Default true.
 *   emptyHint           – string (optional). Secondary text shown below "No conversations yet".
 *   placeholderHint     – string (optional). Secondary text shown in the right-panel placeholder.
 *   tipMessage          – string (optional). Text shown as a tip below the chat grid.
 */
function ChatContainer({
    fetchConversations,
    chatIdScheme: _chatIdScheme,
    maxHeight,
    currentUserId: _currentUserId,
    standalone = false,
    ready = true,
    emptyHint,
    placeholderHint,
    tipMessage,
}) {
    // _chatIdScheme and _currentUserId are part of the public API contract.
    // _chatIdScheme documents ID format ("mongo" | "composite").
    // _currentUserId provides message ownership context to consumers.
    const [conversations, setConversations] = useState([]);
    const [openChats, setOpenChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [loading, setLoading] = useState(true);

    /* ── Fetch conversations ──────────────────────────────────────────── */
    useEffect(() => {
        if (!ready) return;

        let cancelled = false;
        setLoading(true);

        fetchConversations()
            .then((results) => {
                if (cancelled) return;
                const list = Array.isArray(results) ? results : [];
                setConversations(list);

                // Auto-select the first conversation when none is selected
                if (list.length > 0 && !selectedChatId) {
                    const first = list[0];
                    setSelectedChatId(first.id);
                    setOpenChats([
                        {
                            id: first.id,
                            courseId: first.courseId,
                            peerId: first.peerId,
                            peerName: first.peerName,
                            courseName: first.courseName,
                        },
                    ]);
                }
            })
            .catch(() => {
                if (!cancelled) setConversations([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchConversations, ready]);

    /* ── Open a chat tab ──────────────────────────────────────────────── */
    const openChat = useCallback((conversation) => {
        const chatId = conversation.id;
        setSelectedChatId(chatId);
        setUnreadCounts((prev) => ({ ...prev, [chatId]: 0 }));

        setOpenChats((prev) => {
            if (
                prev.some(
                    (c) =>
                        c.courseId === conversation.courseId &&
                        c.peerId === conversation.peerId,
                )
            ) {
                return prev;
            }
            return [
                ...prev,
                {
                    id: conversation.id,
                    courseId: conversation.courseId,
                    peerId: conversation.peerId,
                    peerName: conversation.peerName,
                    courseName: conversation.courseName,
                },
            ];
        });
    }, []);

    /* ── Update the sidebar preview when a new message arrives ────────── */
    const updateConversationPreview = useCallback(
        (conversationId, message) => {
            setConversations((prev) => {
                const updated = prev.map((conv) => {
                    if (conv.id !== conversationId) return conv;
                    return {
                        ...conv,
                        lastMessage:
                            message.text ||
                            conv.lastMessage ||
                            "No messages yet",
                        lastMessageTime:
                            message.createdAt || new Date().toISOString(),
                        messages: [...conv.messages, message],
                    };
                });
                updated.sort(
                    (a, b) =>
                        new Date(b.lastMessageTime) -
                        new Date(a.lastMessageTime),
                );
                return updated;
            });
        },
        [],
    );

    /* ── Close a chat tab ─────────────────────────────────────────────── */
    const closeChat = useCallback((courseId, peerId) => {
        setOpenChats((prev) =>
            prev.filter(
                (c) => !(c.courseId === courseId && c.peerId === peerId),
            ),
        );
    }, []);

    /* ── Auto-select next chat when the currently selected one is closed ── */
    useEffect(() => {
        if (!selectedChatId) return;
        const stillOpen = openChats.some((c) => c.id === selectedChatId);
        if (!stillOpen) {
            setSelectedChatId(
                openChats.length > 0 ? openChats[0].id : null,
            );
        }
    }, [openChats, selectedChatId]);

    /* ── Derived state ────────────────────────────────────────────────── */
    const selectedChat = openChats.find((c) => selectedChatId === c.id);
    const containerHeight =
        maxHeight ||
        (standalone
            ? "calc(100vh - 160px)"
            : "calc(100vh - 250px)");

    /* ── Render ───────────────────────────────────────────────────────── */
    return (
        <div className="animate-in fade-in duration-500">
            <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden"
                style={{ height: containerHeight }}
            >
                {/* ── Conversations List – Left Sidebar ── */}
                <div className="lg:col-span-1 bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-brand-600" />
                            My Chats
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {conversations.length} conversation
                            {conversations.length !== 1 ? "s" : ""}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader className="w-6 h-6 animate-spin text-blue-500" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">
                                    No conversations yet
                                </p>
                                {emptyHint && (
                                    <p className="text-xs mt-2">
                                        {emptyHint}
                                    </p>
                                )}
                            </div>
                        ) : (
                            conversations.map((conversation) => (
                                <ChatConversationItem
                                    key={conversation.id}
                                    conversation={{
                                        ...conversation,
                                        unreadCount:
                                            unreadCounts[
                                                conversation.id
                                            ] || 0,
                                    }}
                                    isSelected={
                                        selectedChatId ===
                                        conversation.id
                                    }
                                    onSelect={() =>
                                        openChat(conversation)
                                    }
                                    onRemove={() =>
                                        closeChat(
                                            conversation.courseId,
                                            conversation.peerId,
                                        )
                                    }
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* ── Active Chat – Right Panel ── */}
                <div className="lg:col-span-2 flex flex-col overflow-hidden">
                    {selectedChat && selectedChatId ? (
                        <ChatPanel
                            key={selectedChatId}
                            courseId={selectedChat.courseId}
                            peerId={selectedChat.peerId}
                            peerName={selectedChat.peerName}
                            courseName={selectedChat.courseName}
                            onNewMessage={(message) =>
                                updateConversationPreview(
                                    selectedChatId,
                                    message,
                                )
                            }
                        />
                    ) : (
                        <div className="glass-panel rounded-2xl flex flex-col items-center justify-center flex-1">
                            <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                                Select a conversation to start chatting
                            </p>
                            {placeholderHint && (
                                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                                    {placeholderHint}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Optional tip ── */}
            {tipMessage && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
                    {tipMessage}
                </p>
            )}
        </div>
    );
}

export default ChatContainer;
