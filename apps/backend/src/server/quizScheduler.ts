import cron from "node-cron";
import dayjs from "dayjs";
import Attempt from "../models/attempt.js";
import Quiz from "../models/quiz.js";
import Enrollment from "../models/enrollment.js";
import { gradeSubmittedAttempt } from "../controllers/attempt.controller.js";
import { notifyUser } from "./socket.js";
import { logActivity } from "../services/logger.js";
import { SCHEDULER } from "../utils/constants.js";

// Track processed quizzes via Quiz.closeNotifiedAt field (persisted across restarts)

export function startQuizScheduler() {
    cron.schedule(SCHEDULER.CRON_INTERVAL, async () => {
        const now = dayjs();
        let processedCount = 0;
        let notifiedCount = 0;

        // Phase 1: Auto-submit expired in-progress attempts
        // Only queries attempts that actually need work (naturally idempotent)
        const expiredAttempts = await Attempt.find({
            status: "inProgress",
            endAt: { $lte: now.toDate() },
        })
            .limit(100)
            .populate("quiz").lean();

        if (expiredAttempts.length === 0) {
            // Still check for closed quizzes notification
            const closedQuizzes = await Quiz.find({
                closeAt: { $lte: now.toDate() },
                gradingMode: "onClose",
                closeNotifiedAt: null,
            }).populate("course", "title").lean();

            await processClosedQuizzes(closedQuizzes, now, (count) => { notifiedCount += count; });
            return;
        }

        // Batch fetch all enrollments for expired attempts
        const userIds = expiredAttempts.map(a => a.user);
        const allEnrollments = await Enrollment.find({
            user: { $in: userIds },
            status: "active",
        }).populate("course", "title").lean();

        // Create lookup map for enrollments by userId
        const enrollmentMap = new Map(
            allEnrollments.map(e => [e.user?.toString(), e])
        );

        for (const attempt of expiredAttempts) {
            const quiz = attempt.quiz as any;
            if (!quiz) continue;

            const wasLate = now.isAfter(dayjs(attempt.endAt));

            // Use atomic update to prevent race conditions
            const result = await Attempt.updateOne(
                {
                    _id: attempt._id,
                    status: "inProgress", // Only update if still in progress
                },
                {
                    $set: {
                        status: wasLate ? "late" : "submitted",
                        submittedAt: now.toDate(),
                    },
                }
            );

            // Skip if already processed by another cron job
            if (result.modifiedCount === 0) {
                continue;
            }

            // Grade immediately (teacher sees grades now, students see after quiz closes)
            const gradeResult = await gradeSubmittedAttempt(attempt, wasLate);

            // Log auto-submit activity
            try {
                const enrollment = enrollmentMap.get(attempt.user?.toString());
                const courseName = (enrollment as any)?.course?.title || "Unknown";

                const score = gradeResult?.score ?? attempt.score ?? 0;
                const maxScore = gradeResult?.maxScore ?? attempt.maxScore ?? 0;
                const percentage = gradeResult?.percentage ?? (maxScore > 0 ? Math.round((score / maxScore) * 100) : 0);

                await logActivity({
                    userId: attempt.user.toString(),
                    action: wasLate ? "quiz_auto_submitted_late" : "quiz_auto_submitted",
                    details: `Auto-submitted quiz: "${quiz.title}" in course "${courseName}" (Score: ${score}/${maxScore}, ${percentage}%)${wasLate ? " [LATE]" : ""}`,
                    metadata: {
                        quizId: quiz._id.toString(),
                        quizTitle: quiz.title,
                        courseId: quiz.course.toString(),
                        courseName,
                        attemptId: attempt._id.toString(),
                        score,
                        maxScore,
                        percentage,
                        isLate: wasLate,
                    },
                });
            } catch (logErr) {
                console.error("Failed to log auto-submit:", logErr);
            }

            processedCount++;
        }

        // Phase 2: Notify students when quiz closes (gradingMode="onClose")
        const closedQuizzes = await Quiz.find({
            closeAt: { $lte: now.toDate() },
            gradingMode: "onClose",
            closeNotifiedAt: null,
        })
            .populate("course", "title")
            .lean();

        await processClosedQuizzes(closedQuizzes, now, (count) => { notifiedCount += count; });
    });

    console.log("Quiz scheduler started");
}

// Helper function to process closed quizzes
async function processClosedQuizzes(
    closedQuizzes: any[],
    now: dayjs.Dayjs,
    incrementNotified: (count: number) => void
) {
    for (const quiz of closedQuizzes) {
        const quizId = quiz._id.toString();
        const courseTitle = (quiz.course as any)?.title || "a course";

        // Persistently mark as notified (survives restarts)
        await Quiz.findByIdAndUpdate(quizId, { closeNotifiedAt: now.toDate() });

        // Get all graded attempts for this quiz
        const attempts = await Attempt.find({
            quiz: quizId,
            status: { $in: ["submitted", "late", "graded"] },
        })
            .populate("user", "name")
            .lean();

        // Get all enrolled students for this course
        const enrollments = await Enrollment.find({
            course: (quiz.course as any)?._id || quiz.course,
            status: "active",
        })
            .populate("user", "name")
            .lean();

        const attemptedUserIds = new Set(attempts.map((a) => a.user?._id?.toString()).filter(Boolean));

        // 1. Notify students who attempted
        for (const attempt of attempts) {
            const studentId = attempt.user?._id?.toString();
            if (!studentId) continue;

            const score = attempt.score || 0;
            const maxScore = attempt.maxScore || 100;
            const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

            notifyUser(studentId, "quiz-graded", {
                quizId,
                quizTitle: quiz.title,
                courseTitle,
                attemptId: attempt._id.toString(),
                score,
                maxScore,
                percentage,
            });

            incrementNotified(1);
        }

        // 2. Notify enrolled students who didn't attempt
        for (const enrollment of enrollments) {
            const studentId = enrollment.user?._id?.toString();
            if (!studentId || attemptedUserIds.has(studentId)) continue;

            notifyUser(studentId, "quiz-missed", {
                quizId,
                quizTitle: quiz.title,
                courseTitle,
            });

            incrementNotified(1);
        }
    }
}
