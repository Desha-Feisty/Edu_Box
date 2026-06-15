import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Loader } from "lucide-react";
import useTeacherStore from "../../stores/Teacherstore";
import ChatConversationItem from "../ChatConversationItem";
import ChatPanel from "../ChatPanel";

function TeacherChatTab({ standalone = false }) {
    const { recentChats, recentChatsLoading, listRecentChats } =
        useTeacherStore();
    const [conversations, setConversations] = useState([]);
    const [openChats, setOpenChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        listRecentChats(true).finally(() => setInitialLoading(false));
    }, [listRecentChats]);

    useEffect(() => {
        if (initialLoading) return;

        const conversationList = recentChats
            .map((item) => {
                const peerName = item.peer?.name || "Unknown";
                const courseName = item.course?.title || "Unknown Course";
                return {
                    id: item._id,
                    courseId: item.courseId,
                    peerId: item.peerId,
                    peerName,
                    courseName,
                    lastMessage: item.text || "No messages yet",
                    lastMessageTime: item.createdAt || new Date().toISOString(),
                    messages: item.messages || [],
                };
            })
            .sort(
                (a, b) =>
                    new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
            );

        setConversations(conversationList);

        if (conversationList.length > 0 && !selectedChatId) {
            setSelectedChatId(conversationList[0].id);
            setOpenChats([
                {
                    courseId: conversationList[0].courseId,
                    peerId: conversationList[0].peerId,
                    peerName: conversationList[0].peerName,
                    courseName: conversationList[0].courseName,
                },
            ]);
        }
    }, [recentChats, initialLoading, selectedChatId]);

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
                    courseId: conversation.courseId,
                    peerId: conversation.peerId,
                    peerName: conversation.peerName,
                    courseName: conversation.courseName,
                },
            ];
        });
    }, []);

    const updateConversationPreview = useCallback((conversationId, message) => {
        setConversations((prev) => {
            const updated = prev.map((conv) => {
                if (conv.id !== conversationId) return conv;
                return {
                    ...conv,
                    lastMessage:
                        message.text || conv.lastMessage || "No messages yet",
                    lastMessageTime:
                        message.createdAt || new Date().toISOString(),
                    messages: [...conv.messages, message],
                };
            });
            updated.sort(
                (a, b) =>
                    new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
            );
            return updated;
        });
    }, []);

    const closeChat = useCallback(
        (courseId, peerId) => {
            const chatId = `${courseId}_${peerId}`;
            setOpenChats((prev) =>
                prev.filter(
                    (c) =>
                        !(c.courseId === courseId && c.peerId === peerId),
                ),
            );
            setOpenChats((current) => {
                if (selectedChatId === chatId) {
                    const remaining = current.filter(
                        (c) =>
                            !(c.courseId === courseId && c.peerId === peerId),
                    );
                    // Use setTimeout to avoid setState-in-setState warning
                    setTimeout(() => {
                        setSelectedChatId(
                            remaining.length > 0
                                ? `${remaining[0].courseId}_${remaining[0].peerId}`
                                : null,
                        );
                    }, 0);
                }
                return current;
            });
        },
        [selectedChatId],
    );

    const selectedChat = openChats.find(
        (c) => selectedChatId === `${c.courseId}_${c.peerId}`,
    );

    const isLoading = initialLoading || recentChatsLoading;

    return (
        <div className="animate-in fade-in duration-500">
            <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden"
                style={{ height: standalone ? "calc(100vh - 160px)" : "calc(100vh - 250px)" }}
            >
                <div className="lg:col-span-1 glass-panel rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                            My Chats
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {conversations.length} conversation
                            {conversations.length !== 1 ? "s" : ""}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader className="w-6 h-6 animate-spin text-blue-500" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No conversations yet</p>
                                <p className="text-xs mt-2">
                                    Chat with students from the Students tab
                                </p>
                            </div>
                        ) : (
                            conversations.map((conversation) => (
                                <ChatConversationItem
                                    key={conversation.id}
                                    conversation={{
                                        ...conversation,
                                        unreadCount:
                                            unreadCounts[conversation.id] || 0,
                                    }}
                                    isSelected={
                                        selectedChatId === conversation.id
                                    }
                                    onSelect={() => openChat(conversation)}
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
                            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                                Or start a chat from the Students tab
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TeacherChatTab;
