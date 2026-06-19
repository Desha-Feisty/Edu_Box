import { useCallback } from "react";
import useTeacherStore from "../../stores/Teacherstore";
import useAuthStore from "../../stores/Authstore";
import { ChatContainer } from "../chat";

function TeacherChatTab({ standalone = false }) {
    const currentUserId = useAuthStore(
        (s) => s.user?.id || s.user?._id,
    );

    const fetchConversations = useCallback(async () => {
        await useTeacherStore.getState().listRecentChats(true);
        const { recentChats } = useTeacherStore.getState();
        return recentChats.map((item) => ({
            id: item._id,
            courseId: item.courseId,
            peerId: item.peerId,
            peerName: item.peer?.name || "Unknown",
            courseName: item.course?.title || "Unknown Course",
            lastMessage: item.text || "No messages yet",
            lastMessageTime:
                item.createdAt || new Date().toISOString(),
            messages: item.messages || [],
        }));
    }, []);

    return (
        <ChatContainer
            fetchConversations={fetchConversations}
            chatIdScheme="mongo"
            currentUserId={currentUserId}
            standalone={standalone}
            emptyHint="Chat with students from the Students tab"
        />
    );
}

export default TeacherChatTab;
