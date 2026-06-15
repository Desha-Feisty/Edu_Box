/**
 * Sprint 4 — Questions-Per-Attempt Snapshot Test
 *
 * Verifies that changing questionsPerAttempt after an attempt has started
 * does NOT retroactively affect the in-progress attempt.
 *
 * Bug: The resume path in startAttempt re-derived questions using the current
 * quiz.questionsPerAttempt value. If a teacher reduced it after the attempt
 * started, the student would lose access to previously-visible questions.
 *
 * Fix: On resume, use the attempt's embedded responses array as the source
 * of truth for which questions to display.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { Types } from "mongoose";
import { setupTestDB, teardownTestDB, clearTestDB } from "../utils/test-db.js";
import {
    createTeacher,
    createStudent,
    generateTestToken,
    type TestUser,
} from "../utils/auth-helpers.js";
import Quiz from "../../src/models/quiz.js";
import Course from "../../src/models/course.js";
import Question from "../../src/models/question.js";
import Enrollment from "../../src/models/enrollment.js";

describe("S4-1: Questions-Per-Attempt Snapshot on Resume", () => {
    let app: express.Express;
    let studentA: TestUser;
    let studentB: TestUser;
    let studentAToken: string;
    let studentBToken: string;
    let courseId: string;
    let quizId: string;

    beforeAll(async () => {
        await setupTestDB();
        studentA = createStudent();
        studentB = createStudent();
        studentAToken = generateTestToken(studentA);
        studentBToken = generateTestToken(studentB);
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        // Fresh app with attempt routes for each test
        app = express();
        app.use(express.json());
        const { default: attemptRoutes } = await import(
            "../../src/routes/attempt.routes.js"
        );
        app.use("/api/attempts", attemptRoutes);

        // Re-create shared test data (wiped by clearTestDB)
        const teacher = createTeacher();
        const course = await Course.create({
            title: "S4 Snapshot Course",
            description: "For snapshot tests",
            teacher: new Types.ObjectId(teacher._id),
            joinCode: "S4TEST01",
        });
        courseId = course._id.toString();

        const quiz = await Quiz.create({
            course: course._id,
            title: "S4 Snapshot Quiz",
            openAt: new Date(Date.now() - 86400000), // already open
            closeAt: new Date(Date.now() + 86400000), // closes later
            durationMinutes: 60,
            published: true,
            attemptsAllowed: 3,
            questionsPerAttempt: 5,
        });
        quizId = quiz._id.toString();

        // Create exactly 10 questions
        for (let i = 0; i < 10; i++) {
            await Question.create({
                quiz: quiz._id,
                questionType: "mcq_single",
                prompt: `S4 Test Q${i + 1}?`,
                points: 1,
                orderIndex: i,
                choices: [
                    { text: "Correct Answer", isCorrect: true },
                    { text: "Wrong A", isCorrect: false },
                    { text: "Wrong B", isCorrect: false },
                    { text: "Wrong C", isCorrect: false },
                ],
            });
        }

        // Enroll both students
        await Enrollment.create({
            course: course._id,
            user: new Types.ObjectId(studentA._id),
            roleInCourse: "student",
            status: "active",
        });
        await Enrollment.create({
            course: course._id,
            user: new Types.ObjectId(studentB._id),
            roleInCourse: "student",
            status: "active",
        });
    });

    it("returns correct number of questions on a new attempt", async () => {
        const res = await request(app)
            .post("/api/attempts/start")
            .set("Authorization", `Bearer ${studentAToken}`)
            .send({ quizId });

        expect(res.status).toBe(201);
        expect(res.body.questions).toHaveLength(5);
    });

    it("resume shows all original questions after questionsPerAttempt reduced", async () => {
        // Start attempt with questionsPerAttempt = 5
        const startRes = await request(app)
            .post("/api/attempts/start")
            .set("Authorization", `Bearer ${studentAToken}`)
            .send({ quizId });

        expect(startRes.status).toBe(201);
        expect(startRes.body.questions).toHaveLength(5);
        const originalIds = startRes.body.questions.map(
            (q: { _id: string }) => q._id,
        );

        // Teacher reduces questionsPerAttempt to 3
        await Quiz.findByIdAndUpdate(quizId, { questionsPerAttempt: 3 });

        // Resume the same attempt — should still get 5 questions (not 3!)
        const resumeRes = await request(app)
            .post("/api/attempts/start")
            .set("Authorization", `Bearer ${studentAToken}`)
            .send({ quizId });

        expect(resumeRes.status).toBe(200);
        expect(resumeRes.body.questions).toHaveLength(5);

        // Same question IDs as the original start
        const resumeIds = resumeRes.body.questions.map(
            (q: { _id: string }) => q._id,
        );
        expect(resumeIds.sort()).toEqual(originalIds.sort());
    });

    it("new attempt by a different student uses updated questionsPerAttempt", async () => {
        // Teacher reduces questionsPerAttempt to 3
        await Quiz.findByIdAndUpdate(quizId, { questionsPerAttempt: 3 });

        // Student B starts a fresh attempt
        const res = await request(app)
            .post("/api/attempts/start")
            .set("Authorization", `Bearer ${studentBToken}`)
            .send({ quizId });

        expect(res.status).toBe(201);
        expect(res.body.questions).toHaveLength(3);
    });

    it("increasing questionsPerAttempt doesn't add questions to existing attempt", async () => {
        // Start attempt with questionsPerAttempt = 5
        const startRes = await request(app)
            .post("/api/attempts/start")
            .set("Authorization", `Bearer ${studentAToken}`)
            .send({ quizId });

        expect(startRes.status).toBe(201);
        expect(startRes.body.questions).toHaveLength(5);

        // Teacher increases to 8
        await Quiz.findByIdAndUpdate(quizId, { questionsPerAttempt: 8 });

        // Resume — should still have 5 (snapshot preserved)
        const resumeRes = await request(app)
            .post("/api/attempts/start")
            .set("Authorization", `Bearer ${studentAToken}`)
            .send({ quizId });

        expect(resumeRes.status).toBe(200);
        expect(resumeRes.body.questions).toHaveLength(5);
    });
});
