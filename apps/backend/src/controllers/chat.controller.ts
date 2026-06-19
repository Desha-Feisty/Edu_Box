import type { Response } from "express";
import ChatMessage from "../models/chat.js";
import type { AuthRequest } from "../types/authRequest.js";

const DEFAULT_MESSAGE_LIMIT = 100;
const MAX_MESSAGES_PER_CONVERSATION = 50;

export const getRecentChatsV1 = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }

        const userId = req.user._id;

        // Find all messages involving the user
        const messages = await ChatMessage.find({
            $or: [{ sender: userId }, { recipient: userId }],
        })
            .sort({ createdAt: -1 })
            .limit(DEFAULT_MESSAGE_LIMIT)
            .populate("course", "title")
            .populate("sender", "name role")
            .populate("recipient", "name role")
            .lean();

        // Group by unique conversation (courseId + peerId)
        const recentChatsMap = new Map();

        messages.forEach((msg: any) => {
            // Add normalized identifiers
            msg.senderId = msg.sender?._id?.toString() || msg.sender?.toString();
            msg.recipientId = msg.recipient?._id?.toString() || msg.recipient?.toString();

            const isSender =
                msg.sender && (msg.sender as any)._id?.toString() === userId;
            const peer = isSender ? msg.recipient : msg.sender;

            if (!peer || !msg.course) return;

            const peerId = (peer as any)._id?.toString() || peer.toString();
            const courseId =
                (msg.course as any)._id?.toString() || msg.course.toString();

            const key = `${courseId}_${peerId}`;

            if (!recentChatsMap.has(key)) {
                recentChatsMap.set(key, {
                    lastMessage: msg,
                    peer,
                    course: msg.course,
                    peerId,
                    courseId,
                });
            }
        });

        const recentChats = Array.from(recentChatsMap.values()).map(
            ({ lastMessage, peer, course, peerId, courseId }) => ({
                _id: `${courseId}_${peerId}`,
                peer,
                course,
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
                sender: lastMessage.sender,
                peerId,
                courseId,
                isMine:
                    lastMessage.sender &&
                    (lastMessage.sender._id?.toString() ||
                        lastMessage.sender?.toString()) === userId,
            }),
        );
        return res.status(200).json({ results: recentChats });
    } catch (error) {
        console.error("Error fetching recent chats V1:", error);
        return res.status(500).json({ errMsg: "Failed to fetch recent chats" });
    }
};

export const getRecentChatsV2 = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }

        const userId = req.user._id;

        // Find latest messages involving the user
        const messages = await ChatMessage.find({
            $or: [{ sender: userId }, { recipient: userId }],
        })
            .sort({ createdAt: -1 })
            .limit(DEFAULT_MESSAGE_LIMIT)
            .select("text createdAt course sender recipient")
            .populate("course", "title")
            .populate("sender", "name role")
            .populate("recipient", "name role")
            .lean();

        // Group by unique conversation (courseId + peerId)
        // Now returns explicit metadata alongside the message history
        const recentChatsMap: Record<
            string,
            { peer: any; course: any; messages: any[]; peerId: string; courseId: string }
        > = {};
        
        messages.forEach((msg: any) => {
            // Add normalized identifiers
            msg.senderId = msg.sender?._id?.toString() || msg.sender?.toString();
            msg.recipientId = msg.recipient?._id?.toString() || msg.recipient?.toString();
            
            const isSender =
                msg.sender && (msg.sender as any)._id?.toString() === userId;
            const peer = isSender ? msg.recipient : msg.sender;
            
            if (!peer || !msg.course) return;
            
            const peerId = (peer as any)._id?.toString() || peer.toString();
            const courseId =
                (msg.course as any)._id?.toString() || msg.course.toString();
            
            const key = `${courseId}_${peerId}`;
            
            if (!recentChatsMap[key]) {
                recentChatsMap[key] = {
                    peer,
                    course: msg.course,
                    messages: [msg],
                    peerId,
                    courseId,
                };
            } else if (recentChatsMap[key].messages.length < MAX_MESSAGES_PER_CONVERSATION) {
                recentChatsMap[key].messages.push(msg);
            }
        });
        
        return res.status(200).json({ results: recentChatsMap });
    } catch (error) {
        console.error("Error fetching recent chats V2:", error);
        return res.status(500).json({ errMsg: "Failed to fetch recent chats" });
    }
};

/**
 * Get the count of unread messages for the current user
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const count = await ChatMessage.countDocuments({
            recipient: userId as any,
            isRead: false,
        });

        return res.json({ unreadCount: count });
    } catch (err) {
        console.error("getUnreadCount error:", err);
        return res.status(500).json({ error: "Failed to get unread count" });
    }
};

/**
 * Mark all messages in a conversation as read
 * Query params: courseId, peerId (sender)
 */
export const markConversationRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { courseId, peerId } = req.query;
        if (!courseId || !peerId) {
            return res.status(400).json({ error: "courseId and peerId are required" });
        }

        const result = await ChatMessage.updateMany(
            {
                course: courseId as any,
                sender: peerId as any,
                recipient: userId as any,
                isRead: false,
            },
            { isRead: true },
        );

        return res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (err) {
        console.error("markConversationRead error:", err);
        return res.status(500).json({ error: "Failed to mark messages as read" });
    }
};

// Default export points to V1 for backward compatibility
export const getRecentChats = getRecentChatsV1;
