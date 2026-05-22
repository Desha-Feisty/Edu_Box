import type { Response } from "express";
import type { AuthRequest } from "../types/authRequest.js";
import Attempt from "../models/attempt.js";
import Quiz from "../models/quiz.js";
import Course from "../models/course.js";
import Enrollment from "../models/enrollment.js";
import { Types } from "mongoose";

const getCourseAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found" });

        // Verify teacher role
        if (!req.user || req.user._id !== course.teacher.toString()) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const quizzes = await Quiz.find({ course: courseId as any }).lean();
        const quizIds = quizzes.map(q => q._id);

        const enrollmentCount = await Enrollment.countDocuments({ course: courseId as any, status: "active" });

        // Use MongoDB aggregation to calculate per-quiz stats (avoids loading all attempts into memory)
        const stats = await Attempt.aggregate([
            { $match: { quiz: { $in: quizIds }, status: { $in: ["graded", "late"] } } },
            {
                $group: {
                    _id: "$quiz",
                    attemptCount: { $sum: 1 },
                    avgPercentage: {
                        $avg: {
                            $cond: [
                                { $gt: ["$maxScore", 0] },
                                { $multiply: [{ $divide: ["$score", "$maxScore"] }, 100] },
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        // Build a map for O(1) lookup
        const statsMap = new Map<string, { attemptCount: number; avgPercentage: number }>();
        for (const s of stats) {
            statsMap.set(s._id.toString(), {
                attemptCount: s.attemptCount,
                avgPercentage: Math.round(s.avgPercentage),
            });
        }

        const quizStats = quizzes.map((quiz) => {
            const s = statsMap.get(quiz._id.toString());
            const attemptCount = s?.attemptCount ?? 0;
            const avgScore = s?.avgPercentage ?? 0;
            const participation = enrollmentCount > 0
                ? Math.round((attemptCount / enrollmentCount) * 100)
                : 0;

            return {
                quizId: quiz._id,
                title: quiz.title,
                avgScore,
                participation,
                attemptCount,
            };
        });

        return res.json({
            courseTitle: course.title,
            studentCount: enrollmentCount,
            quizStats,
        });
    } catch (err) {
        console.error("Course analytics error:", err);
        return res.status(500).json({ error: "Failed to fetch course analytics" });
    }
};

const getStudentProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user?._id;
        if (!studentId) return res.status(401).json({ error: "Unauthorized" });

        // Find all attempts for this student in this course
        const quizzes = await Quiz.find({ course: courseId as any }).select("_id title openAt");
        const quizIds = quizzes.map(q => (q as any)._id);

        const attempts = await Attempt.find({
            user: studentId,
            quiz: { $in: quizIds },
            status: { $in: ["graded", "late"] }
        }).sort({ submittedAt: 1 });

        const history = attempts.map(a => {
            const quiz = quizzes.find(q => q._id.toString() === a.quiz.toString());
            const totalPointsPossible = a.maxScore || 1;
            const scorePercentage = Math.round(((a.score || 0) / totalPointsPossible) * 100);
            
            return {
                quizTitle: quiz?.title || "Unknown",
                score: scorePercentage,
                date: a.submittedAt
            };
        });

        return res.json({ history });
    } catch (err) {
        console.error("Student progress error:", err);
        return res.status(500).json({ error: "Failed to fetch student progress" });
    }
};

export { getCourseAnalytics, getStudentProgress };
