import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import Notification from "../models/notification.js";
import User from "../models/user.js";
import type { NotificationType } from "../models/notification.js";

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer) => {
    const isProduction = process.env.NODE_ENV === "production";

    io = new SocketIOServer(server, {
        cors: {
            origin: isProduction
                ? [
                    "http://localhost",
                    "http://frontend",
                    "http://backend:3000",
                    ...(process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim()) || []),
                  ]
                : [
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:5174",
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                  ],
            methods: ["GET", "POST"],
            credentials: true,
        },
    });
    return io;
};

export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};

const saveNotification = async (userId: string, event: string, data: any) => {
    try {
        const user = await User.findById(userId).select("role");
        if (!user) return;

        let type: NotificationType = "system";
        let title = "Notification";
        let message = "You have a new update";
        let link = "";

        if (event === "new-quiz") {
            type = "quiz";
            title = "New Quiz Released";
            message = `${data.title} is now available in ${data.courseTitle}`;
            link = user.role === "student" ? "/student" : "/teacher";
        } else if (event === "new-note") {
            type = "note";
            title = "New Course Note";
            message = `A new note "${data.title}" has been posted.`;
            link =
                user.role === "student" ? `/note/${data.noteId}` : "/teacher";
        } else if (event === "chat-message") {
            const senderName =
                typeof data.sender === "object" ? data.sender.name : "Teammate";
            type = "chat";
            title = `Message from ${senderName}`;
            message = data.text;
            // Store chat params in link for frontend to open chat window directly
            link = `__chat__?courseId=${data.courseId}&peerId=${data.peerId}&peerName=${encodeURIComponent(senderName)}`;
        } else if (event === "quiz-graded") {
            type = "quiz-graded";
            title = "Grades Released";
            message = `Your grades for "${data.quizTitle}" are now available`;
            link = `/student/quiz/${data.attemptId}/results`;
        } else if (event === "quiz-missed") {
            type = "quiz-missed";
            title = "Quiz Closed";
            message = `Quiz "${data.quizTitle}" has closed. You did not complete it.`;
            link = "/student";
        } else if (event === "new-ticket") {
            type = "ticket";
            title = "New Support Ticket";
            message = `${data.userName} submitted: "${data.subject}"`;
            link = "/admin/tickets";
        } else if (event === "ticket-response") {
            type = "ticket";
            title = "Ticket Response";
            message = `Admin responded to: "${data.subject}"`;
            link = "/settings";
        } else if (event === "calendar-event") {
            type = "calendar-event";
            title = `New Event: ${data.title}`;
            message = `In ${data.courseTitle} - ${new Date(data.startAt).toLocaleString()}`;
            link = "/student/calendar";
        }

        await Notification.create({
            user: userId as any,
            type,
            title,
            message,
            link,
            read: false,
        });
    } catch (err) {
        console.error("Failed to save persistent notification:", err);
    }
};

// Helper for notifying a specific user
export const notifyUser = (userId: string, event: string, data: any) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
        saveNotification(userId, event, data);
    }
};

// Helper for notifying multiple users (e.g. course enrollment)
export const notifyUsers = (userIds: string[], event: string, data: any) => {
    if (io) {
        userIds.forEach((id) => {
            io!.to(`user:${id}`).emit(event, data);
            saveNotification(id, event, data);
        });
    }
};
