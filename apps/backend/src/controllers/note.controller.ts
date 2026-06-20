import Joi from "joi";
import type { Response } from "express";
import type { AuthRequest } from "../types/authRequest.js";
import Note from "../models/note.js";
import Comment from "../models/comment.js";
import Course from "../models/course.js";
import Enrollment from "../models/enrollment.js";

const ensureEnrolled = async (userId: string, courseId: string) => {
    const enrolled = await Enrollment.findOne({
        user: userId,
        course: courseId,
        status: "active",
    });
    return !!enrolled;
};

const createNoteSchema = Joi.object({
    title: Joi.string().required().min(3).max(255),
    content: Joi.string().required().min(10).max(5000),
});

const createNote = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;
        if (!courseId || typeof courseId !== "string") {
            return res.status(400).json({ errMsg: "Course ID required" });
        }

        const { error, value } = createNoteSchema.validate(req.body);
        if (error) {
            return res
                .status(400)
                .json({ errMsg: error.details[0]?.message || error.message });
        }

        if (!req.user?._id) {
            return res.status(401).json({ errMsg: "Unauthenticated" });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errMsg: "Course not found" });
        }

        // Only teacher of course can create notes
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res
                .status(403)
                .json({ errMsg: "Only course teacher can post notes" });
        }

        const note = await Note.create({
            course: courseId,
            teacher: req.user._id,
            title: value.title,
            content: value.content,
            editHistory: [],
        });

        await note.populate("teacher", "name email");

        // Real-time Notification
        try {
            const enrollments = await Enrollment.find({
                course: note.course,
                status: "active",
            }).select("user");

            const studentIds = enrollments.map((e) => e.user.toString());
            if (studentIds.length > 0) {
                const { notifyUsers } = await import("../server/socket.js");
                notifyUsers(studentIds, "new-note", {
                    noteId: note._id,
                    courseId: note.course.toString(),
                    title: note.title,
                    courseTitle: (course as any).title,
                });
            }
        } catch (error) {
            console.error(
                "Failed to send socket notification for new note:",
                error,
            );
        }

        return res.status(201).json({ note });
    } catch (error) {
        console.error("Create note error:", error);
        return res.status(500).json({ errMsg: "Failed to create note" });
    }
};

const listCourseNotes = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;
        if (!courseId || typeof courseId !== "string") {
            return res.status(400).json({ errMsg: "Course ID required" });
        }

        if (!req.user?._id) {
            return res.status(401).json({ errMsg: "Unauthenticated" });
        }

        // Get course to check if user is the teacher
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errMsg: "Course not found" });
        }

        // Allow access if user is the course teacher OR enrolled as a student
        const isTeacher = course.teacher.toString() === req.user._id.toString();
        const enrolled = isTeacher
            ? true
            : await ensureEnrolled(req.user._id.toString(), courseId);

        if (!enrolled) {
            return res
                .status(403)
                .json({ errMsg: "Not enrolled in this course" });
        }

        const notes = await Note.find({ course: courseId })
            .populate("teacher", "name email")
            .sort({ createdAt: -1 })
            .lean();

        // Fetch comment count for each note
        const notesWithCounts = await Promise.all(
            notes.map(async (note) => {
                const commentCount = await Comment.countDocuments({
                    note: note._id,
                });
                return { ...note, commentCount };
            }),
        );

        return res.json({ notes: notesWithCounts });
    } catch (error) {
        console.error("List course notes error:", error);
        return res.status(500).json({ errMsg: "Failed to fetch notes" });
    }
};

const getNoteWithComments = async (req: AuthRequest, res: Response) => {
    try {
        const { noteId } = req.params;
        if (!noteId) {
            return res.status(400).json({ errMsg: "Note ID required" });
        }

        if (!req.user?._id) {
            return res.status(401).json({ errMsg: "Unauthenticated" });
        }

        const note = await Note.findById(noteId)
            .populate("teacher", "name email")
            .populate("course");

        if (!note) {
            return res.status(404).json({ errMsg: "Note not found" });
        }

        // Allow access if user is the course teacher OR enrolled as a student
        const isTeacher =
            req.user?._id?.toString() === (note.teacher as any)?._id?.toString();
        const courseId = (note.course as any)?._id;
        const enrolled = isTeacher
            ? true
            : await ensureEnrolled(req.user._id, courseId);

        if (!enrolled) {
            return res
                .status(403)
                .json({ errMsg: "Not enrolled in this course" });
        }

        const comments = await Comment.find({ note: noteId })
            .populate("user", "name email")
            .sort({ createdAt: 1 });

        return res.json({ note, comments });
    } catch (error) {
        console.error("Get note with comments error:", error);
        return res.status(500).json({ errMsg: "Failed to fetch note" });
    }
};

const updateNoteSchema = Joi.object({
    title: Joi.string().min(3).max(255),
    content: Joi.string().min(10).max(5000),
});

const updateNote = async (req: AuthRequest, res: Response) => {
    try {
        const { noteId } = req.params;
        if (!noteId) {
            return res.status(400).json({ errMsg: "Note ID required" });
        }

        const { error, value } = updateNoteSchema.validate(req.body);
        if (error) {
            return res
                .status(400)
                .json({ errMsg: error.details[0]?.message || error.message });
        }

        if (!req.user?._id) {
            return res.status(401).json({ errMsg: "Unauthenticated" });
        }

        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({ errMsg: "Note not found" });
        }

        // Only note author can update
        if (note.teacher.toString() !== req.user._id.toString()) {
            return res
                .status(403)
                .json({ errMsg: "Only note author can edit" });
        }

        // Store old content in edit history
        if (value.content) {
            note.editHistory.push({
                content: note.content,
                editedAt: new Date(),
            });
        }

        if (value.title) {
            note.title = value.title;
        }
        if (value.content) {
            note.content = value.content;
        }

        await note.save();
        await note.populate("teacher", "name email");

        return res.json({ note });
    } catch (error) {
        console.error("Update note error:", error);
        return res.status(500).json({ errMsg: "Failed to update note" });
    }
};

const deleteNote = async (req: AuthRequest, res: Response) => {
    try {
        const { noteId } = req.params;
        if (!noteId) {
            return res.status(400).json({ errMsg: "Note ID required" });
        }

        if (!req.user?._id) {
            return res.status(401).json({ errMsg: "Unauthenticated" });
        }

        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({ errMsg: "Note not found" });
        }

        // Only note author can delete
        if (note.teacher.toString() !== req.user._id) {
            return res
                .status(403)
                .json({ errMsg: "Only note author can delete" });
        }

        // Delete all comments on this note
        await Comment.deleteMany({ note: noteId });

        await Note.deleteOne({ _id: noteId });

        return res.json({ ok: true });
    } catch (error) {
        console.error("Delete note error:", error);
        return res.status(500).json({ errMsg: "Failed to delete note" });
    }
};

export {
    createNote,
    listCourseNotes,
    getNoteWithComments,
    updateNote,
    deleteNote,
};
