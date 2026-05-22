import type { Server as HttpServer } from "http";
import { type Server as SocketIOServer, type Socket } from "socket.io";
import Jwt, { type JwtPayload } from "jsonwebtoken";
import Course from "../models/course.js";
import Enrollment from "../models/enrollment.js";
import ChatMessage from "../models/chat.js";
import { notifyUser } from "./socket.js";

interface SocketUser {
    _id: string;
    role: string;
}

// Simple in-memory rate limiter for socket events
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();

const checkSocketRateLimit = (userId: string, maxEvents: number = 10, windowMs: number = 1000): boolean => {
    const now = Date.now();
    const entry = socketRateLimits.get(userId);
    
    if (!entry || now > entry.resetAt) {
        socketRateLimits.set(userId, { count: 1, resetAt: now + windowMs });
        return true;
    }
    
    if (entry.count >= maxEvents) {
        return false; // Rate limited
    }
    
    entry.count++;
    return true;
};

// Cleanup stale rate limit entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [userId, entry] of socketRateLimits.entries()) {
        if (now > entry.resetAt) {
            socketRateLimits.delete(userId);
        }
    }
}, 60000);

function verifyToken(token: string): SocketUser {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET missing");
    }
    const payload = Jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    if (
        !payload ||
        typeof payload === "string" ||
        !payload._id ||
        !payload.role
    ) {
        throw new Error("invalid token");
    }
    return { _id: payload._id.toString(), role: payload.role.toString() };
}

function getChatRoom(courseId: string, teacherId: string, studentId: string) {
    return `chat:${courseId}:${teacherId}:${studentId}`;
}

async function validateChatAccess({
    user,
    courseId,
    peerId,
}: {
    user: SocketUser;
    courseId: string;
    peerId: string;
}) {
    const course = await Course.findById(courseId);
    if (!course) {
        throw new Error("course not found");
    }

    const teacherId = course.teacher.toString();

    if (user.role === "teacher") {
        if (user._id !== teacherId) {
            throw new Error("forbidden");
        }
        const enrollment = await Enrollment.findOne({
            course: course._id,
            user: peerId,
            status: "active",
        });
        if (!enrollment) {
            throw new Error("student is not enrolled in this course");
        }
        return {
            room: getChatRoom(courseId, teacherId, peerId),
            peerId,
            teacherId,
            studentId: peerId,
        };
    }

    if (user.role === "student") {
        if (peerId !== teacherId) {
            throw new Error("invalid chat participant");
        }
        const enrollment = await Enrollment.findOne({
            course: course._id,
            user: user._id,
            status: "active",
        });
        if (!enrollment) {
            throw new Error("student is not enrolled in this course");
        }
        return {
            room: getChatRoom(courseId, teacherId, user._id),
            peerId,
            teacherId,
            studentId: user._id,
        };
    }

    throw new Error("forbidden");
}

export function initializeChat(io: SocketIOServer) {
    io.on("connection", (socket: Socket) => {
        const rawToken = socket.handshake.auth?.token;
        if (!rawToken || typeof rawToken !== "string") {
            socket.emit("socket-error", { message: "Authentication required" });
            socket.disconnect(true);
            return;
        }

        let user: SocketUser;
        try {
            user = verifyToken(rawToken);
            socket.data.user = user;
            // Join a private room for personal notifications
            socket.join(`user:${user._id}`);
            console.log(`User ${user._id} joined personal notification room`);
        } catch (error) {
            socket.emit("socket-error", {
                message:
                    error instanceof Error ? error.message : "Invalid token",
            });
            socket.disconnect(true);
            return;
        }

        socket.on("join-chat", async (payload) => {
            try {
                // Rate limit: max 5 join-chat requests per 10 seconds per user
                if (!checkSocketRateLimit(user._id, 5, 10000)) {
                    socket.emit("socket-error", { message: "Too many join requests. Please slow down." });
                    return;
                }
                const { courseId, peerId } = payload || {};
                if (!courseId || !peerId) {
                    throw new Error("courseId and peerId are required");
                }
                const { room } = await validateChatAccess({
                    user,
                    courseId,
                    peerId,
                });
                socket.join(room);

                const messages = await ChatMessage.find({
                    course: courseId,
                    $or: [
                        { sender: user._id, recipient: peerId },
                        { sender: peerId, recipient: user._id },
                    ],
                })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .populate("sender", "name role")
                    .populate("recipient", "name role")
                    .lean();

                // Reverse to chronological order for display
                messages.reverse();

                const normalizedMessages = messages.map((msg: any) => ({
                    ...msg,
                    senderId: msg.sender?._id?.toString() || msg.sender?.toString(),
                    recipientId: msg.recipient?._id?.toString() || msg.recipient?.toString(),
                }));

                socket.emit("chat-history", {
                    room,
                    messages: normalizedMessages,
                });
            } catch (error) {
                socket.emit("socket-error", {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Unable to join chat",
                });
            }
        });

        socket.on("send-chat-message", async (payload) => {
            try {
                // Rate limit: max 10 messages per 2 seconds per user
                if (!checkSocketRateLimit(`send:${user._id}`, 10, 2000)) {
                    socket.emit("socket-error", { message: "Too many messages. Please slow down." });
                    return;
                }
                const { courseId, recipientId, text } = payload || {};
                if (!courseId || !recipientId || !text) {
                    throw new Error(
                        "courseId, recipientId and text are required",
                    );
                }
                const { room, teacherId } = await validateChatAccess({
                    user,
                    courseId,
                    peerId: recipientId,
                });

                if (user.role === "student" && recipientId !== teacherId) {
                    throw new Error("Invalid recipient");
                }

                const message = await ChatMessage.create({
                    course: courseId,
                    sender: user._id,
                    recipient: recipientId,
                    senderRole: user.role,
                    text,
                });

                await message.populate("sender", "name role");
                await message.populate("recipient", "name role");

                const messageObj = message.toObject();
                const outMessage = {
                    ...messageObj,
                    sender: messageObj.sender,
                    recipient: messageObj.recipient,
                    senderId: (messageObj.sender as any)?._id?.toString() || messageObj.sender?.toString(),
                    recipientId: (messageObj.recipient as any)?._id?.toString() || messageObj.recipient?.toString(),
                };

                io.to(room).emit("chat-message", outMessage);

                // Send individual notification for persistence and global alerts
                notifyUser(recipientId, "chat-message", outMessage);
            } catch (error) {
                socket.emit("socket-error", {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Unable to send message",
                });
            }
        });
    });
}
