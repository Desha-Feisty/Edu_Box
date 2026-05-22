import { Router } from "express";
import type { AuthRequest } from "../types/authRequest.js";
import Course from "../models/course.js";
import Note from "../models/note.js";
import Quiz from "../models/quiz.js";
import Enrollment from "../models/enrollment.js";
import User from "../models/user.js";
import Ticket from "../models/ticket.js";
import { Types } from "mongoose";

const router = Router();

// Escape regex special characters to prevent ReDoS and NoSQL injection
const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Search endpoint - searches courses, notes, quizzes, users (admin), tickets (admin)
router.get("/", async (req: AuthRequest, res) => {
    try {
        const { q, type } = req.query;
        
        if (!q || typeof q !== "string" || q.trim().length < 2) {
            return res.status(400).json({ errMsg: "Search query must be at least 2 characters" });
        }

        const query = escapeRegex(q.trim());
        const userId = req.user?._id;
        const role = req.user?.role;

        const results: { 
            courses: any[], 
            notes: any[], 
            quizzes: any[],
            users?: any[],
            tickets?: any[],
            students?: any[],
        } = {
            courses: [],
            notes: [],
            quizzes: [],
        };

        // Admin sees everything + users + tickets
        if (role === "admin") {
            // Search courses - all
            if (!type || type === "courses") {
                results.courses = await Course.find({
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title description joinCode teacher")
                .populate("teacher", "name")
                .lean();
            }

            // Search notes - all
            if (!type || type === "notes") {
                results.notes = await Note.find({
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { content: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title content course createdAt")
                .populate("course", "title")
                .lean();
            }

            // Search quizzes - all
            if (!type || type === "quizzes") {
                results.quizzes = await Quiz.find({
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title description durationMinutes openAt closeAt course published")
                .populate("course", "title")
                .lean();
            }

            // Search users - admin only
            if (!type || type === "users") {
                results.users = await User.find({
                    $or: [
                        { name: { $regex: query, $options: "i" } },
                        { email: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("name email role")
                .lean();
            }

            // Search tickets - admin only
            if (!type || type === "tickets") {
                results.tickets = await Ticket.find({
                    $or: [
                        { subject: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("subject description status priority createdAt user")
                .populate("user", "name email")
                .lean();
            }
        }
        // Teachers see their own courses' content + enrolled students
        else if (role === "teacher" && userId) {
            const teacherCourses = await Course.find({ teacher: userId }).select("_id");
            const courseIds = teacherCourses.map((c) => c._id);

            // Search courses - teacher's own
            if (!type || type === "courses") {
                results.courses = await Course.find({
                    _id: { $in: courseIds },
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title description joinCode teacher")
                .populate("teacher", "name")
                .lean();
            }

            // Search notes - from teacher's courses
            if (!type || type === "notes") {
                results.notes = await Note.find({
                    course: { $in: courseIds },
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { content: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title content course createdAt")
                .populate("course", "title")
                .lean();
            }

            // Search quizzes - from teacher's courses (all, not just published)
            if (!type || type === "quizzes") {
                results.quizzes = await Quiz.find({
                    course: { $in: courseIds },
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title description durationMinutes openAt closeAt course published")
                .populate("course", "title")
                .lean();
            }

            // Search students - enrolled in teacher's courses only
            if (!type || type === "students") {
                const enrolledEnrollments = await Enrollment.find({
                    course: { $in: courseIds },
                    status: "active",
                    roleInCourse: "student",
                }).populate("user", "name email");

                // Filter by name/email and deduplicate by user
                const userMap = new Map();
                enrolledEnrollments.forEach((e) => {
                    if (e.user) {
                        const user = e.user as any;
                        const nameMatch = user.name?.toLowerCase().includes(query.toLowerCase());
                        const emailMatch = user.email?.toLowerCase().includes(query.toLowerCase());
                        if ((nameMatch || emailMatch) && !userMap.has(user._id.toString())) {
                            userMap.set(user._id.toString(), {
                                _id: user._id,
                                name: user.name,
                                email: user.email,
                                role: user.role,
                            });
                        }
                    }
                });

                results.students = Array.from(userMap.values()).slice(0, 10);
            }
        }
        // Students see enrolled courses' content
        else if (role === "student" && userId) {
            const enrollments = await Enrollment.find({ user: userId, status: "active" }).select("course");
            const enrolledCourseIds = enrollments.map((e) => e.course);

            // Search courses - enrolled only
            if (!type || type === "courses") {
                results.courses = await Course.find({
                    _id: { $in: enrolledCourseIds },
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title description joinCode teacher")
                .populate("teacher", "name")
                .lean();
            }

            // Search notes - from enrolled courses
            if (!type || type === "notes") {
                results.notes = await Note.find({
                    course: { $in: enrolledCourseIds },
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { content: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title content course createdAt")
                .populate("course", "title")
                .lean();
            }

            // Search quizzes - from enrolled courses (published only)
            if (!type || type === "quizzes") {
                results.quizzes = await Quiz.find({
                    course: { $in: enrolledCourseIds },
                    published: true,
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } },
                    ],
                })
                .limit(10)
                .select("title description durationMinutes openAt closeAt course")
                .populate("course", "title")
                .lean();
            }
        }

        return res.status(200).json(results);
    } catch (error) {
        console.error("Search error:", error);
        return res.status(500).json({ errMsg: "Search failed" });
    }
});

export default router;