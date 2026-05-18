import { useContext, useState } from "react";
import ChatContext from "./ChatContext";

export function ChatProvider({ children }) {
    const [activeChat, setActiveChat] = useState(null);

    const openChat = (peerId, peerName, courseId) => {
        setActiveChat({ peerId, peerName, courseId });
    };

    const closeChat = () => {
        setActiveChat(null);
    };

    return (
        <ChatContext.Provider value={{ activeChat, openChat, closeChat }}>
            {children}
        </ChatContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within ChatProvider");
    }
    return context;
}

export default ChatProvider;