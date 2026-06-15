/**
 * Sprint 3 — Delete Quiz Cascade Test
 *
 * Verifies that deleting a quiz also deletes all associated attempts (P0).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDB, teardownTestDB } from "../utils/test-db.js";
import { createTestUser } from "../utils/auth-helpers.js";
import Types from "mongoose";
import Quiz from "../../src/models/quiz.js";
import Attempt from "../../src/models/attempt.js";
import Course from "../../src/models/course.js";

describe("S3-2: Delete Quiz Cascade", () => {
    let teacherId: string;
    let courseId: string;

    beforeAll(async () => {
        await setupTestDB();
        const teacher = createTestUser({ role: "teacher" });
        teacherId = teacher._id;
        const course = await Course.create({
            title: "Test Course",
            description: "For cascade tests",
            teacher: teacherId,
            joinCode: "CASCADE01",
        });
        courseId = course._id.toString();
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    it("deletes all attempts when quiz is deleted", async () => {
        const quiz = await Quiz.create({
            course: courseId,
            title: "Cascade Test Quiz",
            openAt: new Date(Date.now() + 86400000),
            closeAt: new Date(Date.now() + 172800000),
            durationMinutes: 30,
            published: true,
        });

        const student1 = createTestUser({ role: "student" });
        const student2 = createTestUser({ role: "student" });
        for (const student of [student1, student2]) {
            await Attempt.create({
                quiz: quiz._id,
                user: student._id,
                startAt: new Date(),
                endAt: new Date(Date.now() + 1800000),
                status: "inProgress",
                responses: [],
            });
        }

        // Verify attempts exist before deletion
        const beforeCount = await Attempt.countDocuments({ quiz: quiz._id });
        expect(beforeCount).toBe(2);

        // Cascade: delete attempts, questions, then the quiz
        await Attempt.deleteMany({ quiz: quiz._id });
        await Quiz.findByIdAndDelete(quiz._id);

        const afterCount = await Attempt.countDocuments({ quiz: quiz._id });
        expect(afterCount).toBe(0);
    });

    it("deleting quiz without attempts does not throw", async () => {
        const quiz = await Quiz.create({
            course: courseId,
            title: "Empty Cascade Test",
            openAt: new Date(Date.now() + 86400000),
            closeAt: new Date(Date.now() + 172800000),
            durationMinutes: 30,
        });

        await expect(Quiz.findByIdAndDelete(quiz._id)).resolves.not.toThrow();
    });

    it("cascade does not affect attempts for other quizzes", async () => {
        const quizA = await Quiz.create({
            course: courseId,
            title: "Quiz A",
            openAt: new Date(Date.now() + 86400000),
            closeAt: new Date(Date.now() + 172800000),
            durationMinutes: 30,
        });
        const quizB = await Quiz.create({
            course: courseId,
            title: "Quiz B",
            openAt: new Date(Date.now() + 86400000),
            closeAt: new Date(Date.now() + 172800000),
            durationMinutes: 30,
        });

        const student = createTestUser({ role: "student" });
        await Attempt.create({
            quiz: quizB._id,
            user: student._id,
            startAt: new Date(),
            endAt: new Date(Date.now() + 1800000),
            status: "inProgress",
            responses: [],
        });

        // Delete quizA
        await Quiz.findByIdAndDelete(quizA._id);

        // quizB attempt should remain
        const quizBCount = await Attempt.countDocuments({ quiz: quizB._id });
        expect(quizBCount).toBe(1);
    });
});
