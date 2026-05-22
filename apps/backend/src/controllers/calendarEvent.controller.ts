import type { AuthRequest } from "../types/authRequest.js";
import type { Response } from "express";
import CalendarEvent from "../models/calendarEvent.js";
import Course from "../models/course.js";
import Enrollment from "../models/enrollment.js";
import { notifyUsers, getIO } from "../server/socket.js";
import { Types } from "mongoose";

const createCalendarEvent = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;
        if (!courseId || typeof courseId !== "string") {
            return res.status(400).json({ errMsg: "course id is required" });
        }

        if (!req.user?._id || req.user.role !== "teacher") {
            return res.status(403).json({ errMsg: "forbidden - only teachers can create events" });
        }

        const { title, description, startAt, endAt, eventType } = req.body;
        if (!title || !startAt) {
            return res.status(400).json({ errMsg: "title and startAt are required" });
        }

        // Verify course exists and teacher owns it
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errMsg: "course not found" });
        }

        const teacherId = course.teacher instanceof Types.ObjectId
            ? course.teacher.toString()
            : (course.teacher as any)._id?.toString() || course.teacher.toString();

        if (teacherId !== req.user._id) {
            return res.status(403).json({ errMsg: "forbidden - you do not own this course" });
        }

        // Create the event
        const calendarEvent = new CalendarEvent({
            course: new Types.ObjectId(courseId),
            title: title.trim(),
            description: description?.trim(),
            startAt: new Date(startAt),
            endAt: endAt ? new Date(endAt) : undefined,
            eventType: eventType || "custom",
            createdBy: new Types.ObjectId(req.user._id),
        });
        await calendarEvent.save();

        // Notify enrolled students
        const enrollments = await Enrollment.find({ course: courseId, status: "active" });
        const studentIds = enrollments.map((e) => e.user.toString());
        const courseTitle = course.title;

        if (studentIds.length > 0) {
            const io = getIO();
            
            // Send socket notifications
            if (io) {
                io.to(`course:${courseId}`).emit("calendar-event", {
                    eventId: calendarEvent._id,
                    courseId,
                    courseTitle,
                    title: calendarEvent.title,
                    description: calendarEvent.description,
                    startAt: calendarEvent.startAt,
                    endAt: calendarEvent.endAt,
                    eventType: calendarEvent.eventType,
                });
            }

            // Send individual notifications
            for (const studentId of studentIds) {
                try {
                    if (io) {
                        io.to(`user:${studentId}`).emit("calendar-event", {
                            eventId: calendarEvent._id,
                            courseId,
                            courseTitle,
                            title: calendarEvent.title,
                            description: calendarEvent.description,
                            startAt: calendarEvent.startAt,
                            endAt: calendarEvent.endAt,
                            eventType: calendarEvent.eventType,
                        });
                    }
                } catch (notifyErr) {
                    console.error(`Failed to notify student ${studentId}:`, notifyErr);
                }
            }
        }

        return res.status(201).json({ calendarEvent });
    } catch (error) {
        console.error("Create calendar event error:", error);
        return res.status(500).json({ errMsg: "failed to create calendar event" });
    }
};

const listCourseCalendarEvents = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;
        if (!courseId || typeof courseId !== "string") {
            return res.status(400).json({ errMsg: "course id is required" });
        }

        // Verify course exists and teacher owns it
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errMsg: "course not found" });
        }

        const teacherId = course.teacher instanceof Types.ObjectId
            ? course.teacher.toString()
            : (course.teacher as any)._id?.toString() || course.teacher.toString();

        if (!req.user?._id) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }

        // Allow teacher or enrolled student to view events
        const isTeacher = teacherId === req.user._id.toString();
        const isEnrolled = await Enrollment.exists({
            user: req.user._id,
            course: courseId,
            status: "active",
        });

        if (!isTeacher && !isEnrolled) {
            return res.status(403).json({ errMsg: "forbidden - you are not enrolled in this course" });
        }

        // Fetch calendar events for the course
        const calendarEvents = await CalendarEvent.find({ course: courseId as any })
            .sort({ startAt: 1 });

        return res.status(200).json({ calendarEvents });
    } catch (error) {
        console.error("List calendar events error:", error);
        return res.status(500).json({ errMsg: "failed to list calendar events" });
    }
};

const updateCalendarEvent = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, eventId } = req.params;
        if (!courseId || !eventId) {
            return res.status(400).json({ errMsg: "course id and event id are required" });
        }

        if (!req.user?._id || req.user.role !== "teacher") {
            return res.status(403).json({ errMsg: "forbidden - only teachers can update events" });
        }

        const { title, description, startAt, endAt, eventType } = req.body;

        // Verify course exists and teacher owns it
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errMsg: "course not found" });
        }

        const teacherId = course.teacher instanceof Types.ObjectId
            ? course.teacher.toString()
            : (course.teacher as any)._id?.toString() || course.teacher.toString();

        if (teacherId !== req.user._id.toString()) {
            return res.status(403).json({ errMsg: "forbidden - you do not own this course" });
        }

        // Find and update the event
        const calendarEvent = await CalendarEvent.findById(eventId);
        if (!calendarEvent) {
            return res.status(404).json({ errMsg: "event not found" });
        }

        if (calendarEvent.course.toString() !== courseId) {
            return res.status(400).json({ errMsg: "event does not belong to this course" });
        }

        // Update fields
        if (title) calendarEvent.title = title.trim();
        if (description !== undefined) calendarEvent.description = description.trim();
        if (startAt) calendarEvent.startAt = new Date(startAt);
        if (endAt) calendarEvent.endAt = new Date(endAt);
        if (eventType) calendarEvent.eventType = eventType;

        await calendarEvent.save();

        // Notify enrolled students about the update
        const enrollments = await Enrollment.find({ course: courseId, status: "active" });
        const studentIds = enrollments.map((e) => e.user.toString());
        const courseTitle = course.title;

        if (studentIds.length > 0) {
            const io = getIO();
            for (const studentId of studentIds) {
                try {
                    if (io) {
                        io.to(`user:${studentId}`).emit("calendar-event-updated", {
                            eventId: calendarEvent._id,
                            courseId,
                            courseTitle,
                            title: calendarEvent.title,
                            description: calendarEvent.description,
                            startAt: calendarEvent.startAt,
                            endAt: calendarEvent.endAt,
                            eventType: calendarEvent.eventType,
                        });
                    }
                } catch (notifyErr) {
                    console.error(`Failed to notify student ${studentId}:`, notifyErr);
                }
            }
        }

        return res.status(200).json({ calendarEvent });
    } catch (error) {
        console.error("Update calendar event error:", error);
        return res.status(500).json({ errMsg: "failed to update calendar event" });
    }
};

const deleteCalendarEvent = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, eventId } = req.params;
        if (!courseId || !eventId) {
            return res.status(400).json({ errMsg: "course id and event id are required" });
        }

        if (!req.user?._id || req.user.role !== "teacher") {
            return res.status(403).json({ errMsg: "forbidden - only teachers can delete events" });
        }

        // Verify course exists and teacher owns it
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errMsg: "course not found" });
        }

        const teacherId = course.teacher instanceof Types.ObjectId
            ? course.teacher.toString()
            : (course.teacher as any)._id?.toString() || course.teacher.toString();

        if (teacherId !== req.user._id) {
            return res.status(403).json({ errMsg: "forbidden - you do not own this course" });
        }

        // Find and delete the event
        const calendarEvent = await CalendarEvent.findById(eventId);
        if (!calendarEvent) {
            return res.status(404).json({ errMsg: "event not found" });
        }

        if (calendarEvent.course.toString() !== courseId) {
            return res.status(400).json({ errMsg: "event does not belong to this course" });
        }

        const eventTitle = calendarEvent.title;
        await calendarEvent.deleteOne();

        // Notify enrolled students about the deletion
        const enrollments = await Enrollment.find({ course: courseId, status: "active" });
        const studentIds = enrollments.map((e) => e.user.toString());

        if (studentIds.length > 0) {
            const io = getIO();
            for (const studentId of studentIds) {
                try {
                    if (io) {
                        io.to(`user:${studentId}`).emit("calendar-event-deleted", {
                            eventId,
                            courseId,
                            title: eventTitle,
                        });
                    }
                } catch (notifyErr) {
                    console.error(`Failed to notify student ${studentId}:`, notifyErr);
                }
            }
        }

        return res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
        console.error("Delete calendar event error:", error);
        return res.status(500).json({ errMsg: "failed to delete calendar event" });
    }
};

export {
    createCalendarEvent,
    listCourseCalendarEvents,
    updateCalendarEvent,
    deleteCalendarEvent,
};