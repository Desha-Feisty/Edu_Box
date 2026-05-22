import Joi from "joi";
import type { Request, Response } from "express";
import Course from "../models/course.js";
import Enrollment from "../models/enrollment.js";
import Quiz from "../models/quiz.js";
import Attempt from "../models/attempt.js";
import Question from "../models/question.js";
import { startSession, Types } from "mongoose";
import { type AuthRequest } from "../types/authRequest.js";

function createJoinCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const createCourseSchema = Joi.object({
    title: Joi.string().min(2).required(),
    description: Joi.string().allow("").optional(),
});

const createCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user._id || req.user.role !== "teacher") {
            return res.status(403).json({ errMsg: "forbidden" });
        }
        const { value, error } = createCourseSchema.validate(req.body);
        if (error) return res.status(400).json({ errMsg: "Invalid input" });
        const { title, description } = value;
        const course = await Course.create({
            title,
            description,
            joinCode: createJoinCode(),
            teacher: new Types.ObjectId(req.user._id),
        });
        return res.status(201).json({ msg: "Course created Successfully", course });
    } catch (error) {
        console.error("Failed to create course", error);
        return res.status(500).json({ errMsg: "Failed to create course!" });
    }
};

const listMyCourses = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }

        if (req.user.role === "teacher") {
            const courses = await Course.aggregate([
                { $match: { teacher: new Types.ObjectId(req.user._id) } },
                { $sort: { createdAt: -1 } },
                // Lookup enrollments for enrollmentCount
                {
                    $lookup: {
                        from: "enrollments",
                        let: { courseId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$course", "$$courseId"] },
                                    status: "active"
                                }
                            },
                            { $count: "count" }
                        ],
                        as: "enrollmentMeta"
                    }
                },
                { $unwind: { path: "$enrollmentMeta", preserveNullAndEmptyArrays: true } },
                { $addFields: { enrollmentCount: { $ifNull: ["$enrollmentMeta.count", 0] } } },
                
                // Lookup quizzes for this course to get quizCount
                {
                    $lookup: {
                        from: "quizzes",
                        let: { courseId: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$course", "$$courseId"] } } },
                            { $project: { _id: 1, published: 1 } }
                        ],
                        as: "quizzes"
                    }
                },
                { $addFields: { quizCount: { $size: "$quizzes" } } },
                
                // Count published quizzes
                { $addFields: { publishedQuizCount: { $size: { $filter: { input: "$quizzes", as: "q", cond: { $eq: ["$$q.published", true] } } } } } },
                { $addFields: { debugQuizzes: "$quizzes" } },
                
                // Lookup attempts for quizzes in this course to calculate avgScore
                {
                    $lookup: {
                        from: "attempts",
                        let: { quizIds: "$quizzes._id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $in: ["$quiz", "$$quizIds"] },
                                            { $eq: ["$status", "graded"] }
                                        ]
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    avgScore: {
                                        $avg: {
                                            $cond: {
                                                if: { $eq: ["$maxScore", 0] },
                                                then: 0,
                                                else: { $multiply: [{ $divide: ["$score", "$maxScore"] }, 100] }
                                            }
                                        }
                                    },
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        as: "attemptStats"
                    }
                },
                { $unwind: { path: "$attemptStats", preserveNullAndEmptyArrays: true } },
                { $addFields: { avgScore: { $ifNull: ["$attemptStats.avgScore", 0] } } },
                
                // Clean up temporary fields (keep publishedQuizCount)
                { $project: { enrollmentMeta: 0, quizzes: 0, attemptStats: 0, quizCount: 0, debugQuizzes: 0 } }
            ]);
            
            return res.json({ courses });
        }

        // Student - show enrolled courses
        const enrollments = await Enrollment.find({
            user: req.user._id,
            status: "active",
        }).populate("course");

        const courses = enrollments
            .map((e) => e.course)
            .filter((c) => c !== null);
        
        // For each course, count published quizzes asynchronously
        const { default: Quiz } = await import("../models/quiz.js");
        const coursesWithQuizCount = await Promise.all(
            courses.map(async (course: any) => {
                const publishedCount = await Quiz.countDocuments({
                    course: course._id,
                    published: true,
                });
                return { 
                    _id: course._id, 
                    title: course.title, 
                    description: course.description,
                    publishedQuizCount: publishedCount 
                };
            })
        );
        
        return res.json({ courses: coursesWithQuizCount });
    } catch (error) {
        console.error("Failed to list my courses:", error);
        return res.status(500).json({ errMsg: "failed to fetch courses" });
    }
};

const listAllCourses = async (req: Request, res: Response) => {
    try {
        const courses = await Course.find({}).select("-joinCode").lean();
        return res.status(200).json({ numCourses: courses.length, courses });
    } catch (error) {
        console.error("Error listing courses", error);
        return res.status(500).json({ errMsg: "failed to list courses!" });
    }
};

const getCourse = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(403).json({ errMsg: "forbidden" });
        const { id: courseId } = req.params;
        if (!courseId)
            return res.status(404).json({ errMsg: "invalid courseId" });
        let courseQuery = Course.findById(courseId);
        if (req.user.role !== "teacher") {
            courseQuery = courseQuery.select("-joinCode");
        }
        const course = await courseQuery.lean();
        if (!course)
            return res.status(404).json({ errMsg: "error finding course" });
        if (req.user.role === "teacher") {
            if (!req.user || req.user._id !== course.teacher.toString()) {
                return res.status(403).json({ errMsg: "forbidden!" });
            }
        } else {
            const enrollment = await Enrollment.findOne({
                user: req.user._id,
                course: courseId,
                status: "active",
            })
                .lean();
            if (!enrollment)
                return res.status(403).json({ errMsg: "forbidden" });
        }
        return res.status(200).json({ course });
    } catch (error) {
        console.error("Failed to fetch course", error);
        return res.status(500).json({ errMsg: "internal server error!" });
    }
};

const updateCourseSchema = Joi.object({
    title: Joi.string().min(2).optional(),
    description: Joi.string().allow("").optional(),
}).or("title", "description");

const updateCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { error, value } = updateCourseSchema.validate(req.body);
        if (error)
            return res.status(400).json({ error: error.details[0]?.message });
        const { id: courseId } = req.params;
        const course = await Course.findById(courseId);
        if (!course)
            return res.status(404).json({ errMsg: "course not found" });
        if (req.user?._id !== course.teacher.toString()) {
            return res.status(403).json({ errMsg: "forbidden!" });
        }
        if (value.title) course.title = value.title;
        if (value.description) course.description = value.description;
        await course.save();
        return res.json({ course });
    } catch (error) {
        console.error({ errMsg: "error updating course", error });
        return res.status(500).json({ errMsg: "failed to update course" });
    }
};

const joinSchema = Joi.object({ joinCode: Joi.string().required() });

const joinCourseByCode = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?._id) return res.status(403).json({ errMsg: "forbidden" });
        const { error, value } = joinSchema.validate(req.body);
        if (error)
            return res
                .status(400)
                .json({ error: error.details[0]?.message || error.message });

        const course = await Course.findOne({ joinCode: value.joinCode });
        if (!course)
            return res.status(404).json({ errMsg: "invalid join code!" });

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
            course: course._id,
            user: req.user._id,
            status: "active",
        });

        if (existingEnrollment) {
            return res.status(400).json({ errMsg: "you are already enrolled in this course" });
        }

        // Create new enrollment with error handling for duplicates
        try {
            const enrollment = await Enrollment.create({
                course: course._id,
                user: req.user._id,
                roleInCourse: "student",
                status: "active",
            });
            return res.status(200).json({ course, enrolledAt: enrollment.createdAt });
        } catch (createError: any) {
            // Handle duplicate key error (race condition)
            if (createError.code === 11000) {
                return res.status(400).json({ errMsg: "you are already enrolled in this course" });
            }
            throw createError; // Re-throw for other errors
        }
    } catch (error) {
        console.error(
            "failed to join course",
            error instanceof Error ? error.message : error,
        );
        return res.status(500).json({ errMsg: "failed to join course" });
    }
};

const getRoster = async (req: AuthRequest, res: Response) => {
    try {
        const { id: courseId } = req.params;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errMsg: "course not found" });
        }
        if (!req.user || req.user._id !== course.teacher.toString()) {
            return res.status(403).json({ errMsg: "forbidden!" });
        }
        const enrollment = await Enrollment.find({
            course: course._id,
            status: "active",
        })
            .populate("user", "name email")
            .lean();
        return res.status(200).json({ num: enrollment.length, enrollment });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to get roster" });
    }
};

const deleteCourse = async (req: AuthRequest, res: Response) => {
    const session = await startSession();
    session.startTransaction();
    try {
        const { id: courseId } = req.params;
        if (!courseId)
            return res.status(404).json({ errMsg: "incorrect course id" });
        const course = await Course.findById(courseId).session(session);
        if (!course) {
            await session.abortTransaction();
            return res.status(404).json({ errMsg: "course not found" });
        }
        if (!req.user || req.user._id !== course.teacher.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ errMsg: "forbidden!" });
        }
        await Enrollment.deleteMany({ course: course._id }).session(session);
        await Course.findByIdAndDelete(courseId).session(session);
        await session.commitTransaction();
        return res.status(200).json({ msg: "course successfully deleted" });
    } catch (error) {
        await session.abortTransaction();
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to delete course" });
    } finally {
        session.endSession();
    }
};

const removeEnrollment = async (req: AuthRequest, res: Response) => {
    try {
        const { id: courseId } = req.params;
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ errMsg: "studentId is required" });
        }

        const course = await Course.findById(courseId);
        if (!course)
            return res.status(404).json({ errMsg: "course not found" });

        if (!req.user || req.user._id !== course.teacher.toString()) {
            return res.status(403).json({
                errMsg: "forbidden! only course teacher can remove students",
            });
        }

        // Find and remove the enrollment
        const enrollment = await Enrollment.findOneAndDelete({
            course: course._id,
            user: studentId,
            status: "active",
        });

        if (!enrollment) {
            return res
                .status(404)
                .json({ errMsg: "student not enrolled in this course" });
        }

        return res.status(200).json({
            message: "Student removed from course successfully",
        });
    } catch (error) {
        console.error(
            "Remove enrollment error:",
            error instanceof Error ? error.message : error,
        );
        return res.status(500).json({
            errMsg: "failed to remove student from course",
        });
    }
};

// Export all course quiz grades as CSV
const exportCourseGradesCsv = async (req: AuthRequest, res: Response) => {
    try {
        const { id: courseId } = req.params;
        
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ errMsg: "Course not found" });
        
        // Verify teacher ownership
        if (!req.user || req.user._id !== course.teacher.toString()) {
            return res.status(403).json({ errMsg: "Forbidden" });
        }
        
        // Get all published quizzes for this course
        const quizzes = await Quiz.find({ 
            course: course._id, 
            published: true 
        }).select("_id title").lean();
        
        if (quizzes.length === 0) {
            return res.status(404).json({ errMsg: "No published quizzes in this course" });
        }
        
        // Get all graded/submitted/late attempts for all quizzes in this course
        const quizIds = quizzes.map(q => q._id);
        const attempts = await Attempt.find({
            quiz: { $in: quizIds },
            status: { $in: ["graded", "late", "submitted"] },
        })
            .populate("user", "name email")
            .populate({ 
                path: "quiz", 
                model: "Quiz",
                select: "title" 
            })
            .populate({ path: "responses.question", model: "Question" })
            .select("user quiz score submittedAt status responses")
            .sort({ submittedAt: -1 })
            .lean();
        
        // Get all questions for max score calculation
        const allQuestions = await Question.find({ quiz: { $in: quizIds } }).lean();
        const maxScorePerQuestion: Record<string, number> = {};
        for (const q of allQuestions) {
            maxScorePerQuestion[q._id.toString()] = q.points || 1;
        }
        
        // Build CSV content
        const headers = ["Quiz Title", "Student Name", "Email", "Score", "Submitted At", "Status"];
        const rows = [headers.join(",")];
        
        for (const a of attempts) {
            const quiz = a.quiz as any;
            const student = a.user as any;
            const quizTitle = quiz?.title || "Unknown Quiz";
            const studentName = student?.name || "Unknown";
            const email = student?.email || "";
            
            // Calculate raw score
            const rawScore = a.responses?.reduce((sum, r) => {
                return sum + ((r as any).pointsAwarded || 0);
            }, 0) || 0;
            
            // Calculate max possible points for this attempt
            const maxPoints = a.responses?.reduce((sum, r) => {
                const qId = (r as any).question?._id?.toString() || (r as any).question?.toString();
                return sum + (maxScorePerQuestion[qId] || 1);
            }, 0) || 0;
            
            const scoreDisplay = `(${rawScore}/${maxPoints})`;
            const submittedAt = a.submittedAt ? new Date(a.submittedAt).toLocaleString("en-GB") : "";
            const status = a.status || "unknown";
            
            // Simple escape for CSV
            const escapeCsv = (field: string) => {
                if (field.includes(",") || field.includes('"')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };
            
            const row = [
                escapeCsv(quizTitle),
                escapeCsv(studentName),
                escapeCsv(email),
                escapeCsv(scoreDisplay),
                escapeCsv(submittedAt),
                escapeCsv(status),
            ].join(",");
            
            rows.push(row);
        }
        
        const csv = rows.join("\n");
        const filename = `course-grades-${course.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
        
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
    } catch (error) {
        console.error("Export course grades error:", error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "Failed to export course grades" });
    }
};

// Export grades matrix (students as rows, quizzes as columns)
const exportGradesMatrixCsv = async (req: AuthRequest, res: Response) => {
    try {
        const { id: courseId } = req.params;
        
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ errMsg: "Course not found" });
        
        // Verify teacher ownership
        if (!req.user || req.user._id !== course.teacher.toString()) {
            return res.status(403).json({ errMsg: "Forbidden" });
        }
        
        // Get all active enrollments in this course
        const enrollments = await Enrollment.find({ 
            course: course._id, 
            status: "active" 
        }).populate("user", "name").lean();
        
        if (enrollments.length === 0) {
            return res.status(404).json({ errMsg: "No students enrolled in this course" });
        }
        
        // Get all published quizzes, sorted by createdAt descending (newest first)
        const quizzes = await Quiz.find({ 
            course: course._id, 
            published: true 
        }).select("_id title createdAt").sort({ createdAt: -1 }).lean();
        
        if (quizzes.length === 0) {
            return res.status(404).json({ errMsg: "No published quizzes in this course" });
        }
        
        // Create quiz map for lookup
        const quizMap: Record<string, { id: string, title: string }> = {};
        for (const q of quizzes) {
            quizMap[q._id.toString()] = { id: q._id.toString(), title: q.title };
        }
        
        const quizIds = quizzes.map(q => q._id);
        const quizTitles = quizzes.map(q => q.title);
        
        // Get all attempts for these quizzes (need to populate questions to get points)
        const attempts = await Attempt.find({
            quiz: { $in: quizIds },
            status: { $in: ["graded", "late", "submitted"] },
        })
            .populate("user", "name")
            .populate({ path: "responses.question", model: "Question" })
            .lean();
        
        // Build student scores map: studentId -> quizId -> score
        const studentScores: Record<string, Record<string, string>> = {};
        
        // Initialize all students
        for (const e of enrollments) {
            const userObj = e.user as any;
            if (userObj && userObj._id) {
                const studentId = userObj._id.toString();
                studentScores[studentId] = {};
            }
        }
        
        // Process each attempt
        for (const a of attempts) {
            const userObj = a.user as any;
            const studentId = userObj?._id?.toString();
            if (!studentId || !studentScores[studentId]) continue;
            
            const quizId = a.quiz?.toString();
            if (!quizId || !quizMap[quizId]) continue;
            
            // Calculate score using the questions from the attempt
            const rawScore = a.responses?.reduce((sum: number, r: any) => {
                return sum + (r.pointsAwarded || 0);
            }, 0) || 0;
            
            const maxPoints = a.responses?.reduce((sum: number, r: any) => {
                const question = r.question as any;
                return sum + (question?.points || 1);
            }, 0) || 0;
            
            studentScores[studentId][quizId] = `(${rawScore}/${maxPoints})`;
        }
        
        // Get student names from enrollments, sorted alphabetically
        const studentList = enrollments
            .map(e => {
                const userObj = e.user as any;
                return { id: userObj?._id?.toString(), name: userObj?.name || "Unknown" };
            })
            .filter(s => s.id)
            .sort((a, b) => a.name.localeCompare(b.name));
        
        // Build CSV: Column 1 = Student Name, then quiz titles
        const headers = ["Student Name", ...quizTitles];
        const rows = [headers.join(",")];
        
        for (const student of studentList) {
            const studentId = student.id!;
            const scores = studentScores[studentId] || {};
            const rowScores: string[] = [student.name];
            
            // For each quiz (in order - newest first)
            for (const quiz of quizzes) {
                const quizId = quiz._id.toString();
                const score = scores[quizId] || "(0/0)";
                rowScores.push(score);
            }
            
            // Escape fields - quote score fields
            const escapeCsv = (field: string, isScore: boolean = false) => {
                // Quote scores to prevent Excel parsing as dates
                if (isScore && /^\(\d+\/\d+\)$/.test(field)) {
                    return field; // Already has parentheses
                }
                if (field.includes(",") || field.includes('"')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };
            
            // First field is name (no score), rest are scores
            rows.push([rowScores[0], ...rowScores.slice(1).map(f => escapeCsv(f, true))].join(","));
        }
        
        const csv = rows.join("\n");
        const filename = `course-grades-matrix-${course.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
        
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
    } catch (error) {
        console.error("Export grades matrix error:", error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "Failed to export grades matrix" });
    }
};

export {
    getCourse,
    createCourse,
    joinCourseByCode,
    updateCourse,
    deleteCourse,
    getRoster,
    removeEnrollment,
    listAllCourses,
    listMyCourses,
    exportCourseGradesCsv,
    exportGradesMatrixCsv,
};