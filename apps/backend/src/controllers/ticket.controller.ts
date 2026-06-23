import type { AuthRequest } from "../types/authRequest.js";
import type { Response } from "express";
import Ticket from "../models/ticket.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import { getIO, notifyUser } from "../server/socket.js";

const createTicket = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }

        const { subject, message } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ errMsg: "subject and message are required" });
        }

        const ticket = new Ticket({
            user: req.user._id as any,
            subject: subject.trim(),
            message: message.trim(),
        });
        await ticket.save();

        // Get user info for notification
        const user = await User.findById(req.user._id).select("name");
        const userName = user?.name || "A user";

        // Notify all admins about the new ticket
        try {
            const admins = await User.find({ role: "admin" }).select("_id");
            const io = getIO();
            for (const admin of admins) {
                // Save notification to database FIRST (before socket emit)
                await Notification.create({
                    user: admin._id as any,
                    title: "New Support Ticket",
                    message: `${userName} submitted: "${ticket.subject}"`,
                    type: "ticket",
                    link: "/admin/tickets",
                    read: false,
                });
                
                // Then emit socket event (frontend fetches notifications on receiving it)
                if (io) {
                    io.to(`user:${admin._id}`).emit("new-ticket", {
                        ticketId: ticket._id,
                        subject: ticket.subject,
                        userName,
                        message: ticket.message,
                    });
                }
            }
        } catch (notifyErr) {
            console.error("Failed to notify admins:", notifyErr);
        }

        return res.status(201).json({ ticket });
    } catch (error) {
        console.error("Create ticket error:", error);
        return res.status(500).json({ errMsg: "failed to create ticket" });
    }
};

const listMyTickets = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }

        const tickets = await Ticket.find({ user: req.user._id } as any).sort({ createdAt: -1 });

        return res.status(200).json({ tickets });
    } catch (error) {
        console.error("List tickets error:", error);
        return res.status(500).json({ errMsg: "failed to fetch tickets" });
    }
};

const listAllTickets = async (req: AuthRequest, res: Response) => {
    try {
        const tickets = await Ticket.find()
            .populate("user", "name email role")
            .sort({ createdAt: -1 });

        return res.status(200).json({ tickets });
    } catch (error) {
        console.error("List all tickets error:", error);
        return res.status(500).json({ errMsg: "failed to fetch tickets" });
    }
};

const respondToTicket = async (req: AuthRequest, res: Response) => {
    try {
        const { id: ticketId } = req.params;
        const { adminReply } = req.body;

        if (!ticketId) {
            return res.status(400).json({ errMsg: "ticket id is required" });
        }

        if (!adminReply?.trim()) {
            return res.status(400).json({ errMsg: "admin reply is required" });
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ errMsg: "ticket not found" });
        }

        const userId = ticket.user.toString();
        const subject = ticket.subject;

        // Update ticket - keep status as open, just add admin reply
        await Ticket.findByIdAndUpdate(
            ticketId,
            {
                adminReply: adminReply.trim(),
            },
            { new: true }
        );

        // Notify the user (notifyUser calls saveNotification which persists to DB)
        notifyUser(userId, "ticket-response", {
            ticketId,
            subject,
            adminReply: adminReply.trim(),
        });

        return res.status(200).json({ message: "Response sent successfully" });
    } catch (error) {
        console.error("Respond to ticket error:", error);
        return res.status(500).json({ errMsg: "failed to respond to ticket" });
    }
};

const closeTicket = async (req: AuthRequest, res: Response) => {
    try {
        const { id: ticketId } = req.params;
        
        if (!ticketId) {
            return res.status(400).json({ errMsg: "ticket id is required" });
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ errMsg: "ticket not found" });
        }

        // Check if user is admin or the ticket owner
        const isAdmin = req.user?.role === "admin";
        const isOwner = ticket.user.toString() === req.user?._id;
        
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ errMsg: "not authorized to close this ticket" });
        }

        // Update ticket status to closed
        await Ticket.findByIdAndUpdate(
            ticketId,
            { status: "closed" },
            { new: true }
        );

        return res.status(200).json({ message: "Ticket closed successfully" });
    } catch (error) {
        console.error("Close ticket error:", error);
        return res.status(500).json({ errMsg: "failed to close ticket" });
    }
};

export {
    createTicket,
    listMyTickets,
    listAllTickets,
    respondToTicket,
    closeTicket,
};