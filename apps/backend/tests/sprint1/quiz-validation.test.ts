/**
 * Sprint 1 — Quiz Validation Tests
 *
 * Verifies:
 * - openAt must be before closeAt (existing)
 * - durationMinutes cannot exceed time window (existing)
 * - openAt must be in the future (S1-4 — MISSING VALIDATION)
 * - durationMinutes must be >= 10 (existing)
 * - All edge cases around validation boundaries
 * - Update validation also enforces constraints
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import { setupTestDB, teardownTestDB, clearTestDB } from "../utils/test-db.js";
import { createTeacher, createStudent, generateTestToken, type TestUser } from "../utils/auth-helpers.js";
import { createTestQuiz, createTestCourse } from "../utils/factory.js";
import Quiz from "../../src/models/quiz.js";
import Course from "../../src/models/course.js";

/**
 * Helper: Create an app with quiz routes mounted + mocked auth
 * Using the actual route + controller for full integration
 */
async function createQuizApp() {
    const app = express();
    app.use(express.json());

    const { default: quizRoutes } = await import("../../src/routes/quiz.routes.js");
    app.use("/api/quizzes", quizRoutes);
    
    return app;
}

describe("Quiz Validation — Create (S1-4: openAt > now)", () => {
    let app: express.Express;
    let teacherToken: string;
    let teacher: TestUser;

    beforeAll(async () => {
        await setupTestDB();
        teacher = createTeacher();
        teacherToken = generateTestToken(teacher);
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        app = await createQuizApp();
    });

    /**
     * Helper: POST to create quiz via body route (with valid course)
     */
    async function createValidQuiz(overrides: Record<string, any> = {}) {
        const course = await Course.create(createTestCourse({ teacher: new Types.ObjectId(teacher._id) }));
        const courseId = course._id.toString();

        const futureOpen = dayjs().add(1, "day").toISOString();
        const futureClose = dayjs().add(1, "day").add(2, "hour").toISOString();

        const payload = {
            courseId,
            title: "Test Quiz",
            openAt: futureOpen,
            closeAt: futureClose,
            durationMinutes: 60,
            ...overrides,
        };

        return request(app)
            .post("/api/quizzes/")
            .set("Authorization", `Bearer ${teacherToken}`)
            .send(payload);
    }

    describe("openAt Validation (S1-4)", () => {
        it("accepts openAt in the future (24h from now)", async () => {
            const res = await createValidQuiz();
            expect(res.status).toBe(201);
        });

        it("accepts openAt 1 minute from now", async () => {
            const openAt = dayjs().add(1, "minute").toISOString();
            const closeAt = dayjs().add(1, "hour").toISOString();
            // Window is ~59 min, so use duration that fits
            const res = await createValidQuiz({ openAt, closeAt, durationMinutes: 30 });
            expect(res.status).toBe(201);
        });

        it("REJECTS openAt in the past (S1-4)", async () => {
            const openAt = dayjs().subtract(1, "hour").toISOString();
            const closeAt = dayjs().add(1, "hour").toISOString();
            const res = await createValidQuiz({ openAt, closeAt });
            expect(res.status).toBe(400);
        });

        it("REJECTS openAt equal to now (S1-4)", async () => {
            const openAt = dayjs().toISOString();
            const closeAt = dayjs().add(1, "hour").toISOString();
            const res = await createValidQuiz({ openAt, closeAt, durationMinutes: 30 });
            expect(res.status).toBe(400);
        });

        it("accepts openAt well in the future (30 days)", async () => {
            const openAt = dayjs().add(30, "day").toISOString();
            const closeAt = dayjs().add(30, "day").add(2, "hour").toISOString();
            const res = await createValidQuiz({ openAt, closeAt });
            expect(res.status).toBe(201);
        });
    });

    describe("Duration Validation", () => {
        it("accepts minimum valid duration (10 min)", async () => {
            const openAt = dayjs().add(1, "day").toISOString();
            const closeAt = dayjs().add(1, "day").add(10, "minute").toISOString();
            const res = await createValidQuiz({ openAt, closeAt, durationMinutes: 10 });
            expect(res.status).toBe(201);
        });

        it("rejects duration < 10 minutes", async () => {
            const res = await createValidQuiz({ durationMinutes: 9 });
            expect(res.status).toBe(400);
            expect(res.body.errMsg || "").toContain("durationMinutes");
        });

        it("rejects duration > time window", async () => {
            const openAt = dayjs().add(1, "day").toISOString();
            const closeAt = dayjs().add(1, "day").add(30, "minute").toISOString();
            const res = await createValidQuiz({ openAt, closeAt, durationMinutes: 31 });
            expect(res.status).toBe(400);
            expect(res.body.errMsg || "").toContain("cannot exceed");
        });

        it("accepts duration at exact time window boundary", async () => {
            const openAt = dayjs().add(1, "day").toISOString();
            const closeAt = dayjs().add(1, "day").add(30, "minute").toISOString();
            const res = await createValidQuiz({ openAt, closeAt, durationMinutes: 30 });
            expect(res.status).toBe(201);
        });

        it("rejects negative duration", async () => {
            const res = await createValidQuiz({ durationMinutes: -5 });
            expect(res.status).toBe(400);
        });
    });

    describe("openAt / closeAt Ordering", () => {
        it("rejects openAt > closeAt", async () => {
            const openAt = dayjs().add(2, "day").toISOString();
            const closeAt = dayjs().add(1, "day").toISOString();
            const res = await createValidQuiz({ openAt, closeAt });
            expect(res.status).toBe(400);
            expect(res.body.errMsg || "").toContain("before closeAt");
        });

        it("rejects openAt == closeAt", async () => {
            const sameTime = dayjs().add(1, "day").toISOString();
            const res = await createValidQuiz({ openAt: sameTime, closeAt: sameTime });
            expect(res.status).toBe(400);
        });
    });

    describe("Required Fields", () => {
        it("rejects missing title", async () => {
            const { title, ...rest } = {} as any;
            const res = await createValidQuiz({ title: undefined });
            // Will be handled by Joi validation
            expect(res.status).toBe(400);
        });

        it("rejects empty title", async () => {
            const res = await createValidQuiz({ title: "" });
            expect(res.status).toBe(400);
        });

        it("rejects title < 2 characters", async () => {
            const res = await createValidQuiz({ title: "A" });
            expect(res.status).toBe(400);
        });

        it("rejects missing openAt", async () => {
            const res = await createValidQuiz({ openAt: undefined });
            expect(res.status).toBe(400);
        });

        it("rejects missing closeAt", async () => {
            const res = await createValidQuiz({ closeAt: undefined });
            expect(res.status).toBe(400);
        });

        it("rejects missing durationMinutes", async () => {
            const res = await createValidQuiz({ durationMinutes: undefined });
            expect(res.status).toBe(400);
        });
    });

    describe("Course Ownership", () => {
        it("rejects quiz creation for non-owned course", async () => {
            const otherTeacher = createTeacher({ _id: new Types.ObjectId().toString() });
            const otherCourse = await Course.create(createTestCourse({ teacher: new Types.ObjectId(otherTeacher._id) }));

            const openAt = dayjs().add(1, "day").toISOString();
            const closeAt = dayjs().add(1, "day").add(2, "hour").toISOString();

            const res = await request(app)
                .post("/api/quizzes/")
                .set("Authorization", `Bearer ${teacherToken}`)
                .send({
                    courseId: otherCourse._id.toString(),
                    title: "Test Quiz",
                    openAt,
                    closeAt,
                    durationMinutes: 60,
                });

            expect(res.status).toBe(403);
        });

        it("rejects for non-existent course", async () => {
            const fakeCourseId = new Types.ObjectId().toString();
            const openAt = dayjs().add(1, "day").toISOString();
            const closeAt = dayjs().add(1, "day").add(2, "hour").toISOString();

            const res = await request(app)
                .post("/api/quizzes/")
                .set("Authorization", `Bearer ${teacherToken}`)
                .send({
                    courseId: fakeCourseId,
                    title: "Test Quiz",
                    openAt,
                    closeAt,
                    durationMinutes: 60,
                });

            expect(res.status).toBe(404);
        });
    });
});

describe("Quiz Validation — Update (S1-4 scope)", () => {
    let app: express.Express;
    let teacherToken: string;
    let teacher: TestUser;
    let quizId: string;

    beforeAll(async () => {
        await setupTestDB();
        teacher = createTeacher();
        teacherToken = generateTestToken(teacher);
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        app = await createQuizApp();

        // Create a quiz owned by this teacher
        const course = await Course.create(createTestCourse({ teacher: new Types.ObjectId(teacher._id) }));
        const quiz = await Quiz.create(createTestQuiz({ course: course._id }));
        quizId = quiz._id.toString();
    });

    it("accepts valid update (title only)", async () => {
        const res = await request(app)
            .put(`/api/quizzes/${quizId}`)
            .set("Authorization", `Bearer ${teacherToken}`)
            .send({ title: "Updated Quiz Title" });
        expect(res.status).toBe(200);
    });

    it("rejects duration < 10 on update", async () => {
        const res = await request(app)
            .put(`/api/quizzes/${quizId}`)
            .set("Authorization", `Bearer ${teacherToken}`)
            .send({ durationMinutes: 5 });
        expect(res.status).toBe(400);
    });

    it("rejects openAt after closeAt on update", async () => {
        const res = await request(app)
            .put(`/api/quizzes/${quizId}`)
            .set("Authorization", `Bearer ${teacherToken}`)
            .send({
                openAt: "2027-06-15T12:00:00Z",
                closeAt: "2027-06-15T10:00:00Z",
            });
        expect(res.status).toBe(400);
    });

    it("rejects duration exceeding time window on update", async () => {
        const res = await request(app)
            .put(`/api/quizzes/${quizId}`)
            .set("Authorization", `Bearer ${teacherToken}`)
            .send({
                openAt: "2027-06-15T10:00:00Z",
                closeAt: "2027-06-15T11:00:00Z",
                durationMinutes: 61,
            });
        expect(res.status).toBe(400);
    });

    it("accepts partial update (single field)", async () => {
        const res = await request(app)
            .put(`/api/quizzes/${quizId}`)
            .set("Authorization", `Bearer ${teacherToken}`)
            .send({ description: "Updated description" });
        expect(res.status).toBe(200);
    });

    it("rejects update from non-owner teacher", async () => {
        const otherTeacher = createTeacher({ _id: new Types.ObjectId().toString() });
        const otherToken = generateTestToken(otherTeacher);

        const res = await request(app)
            .put(`/api/quizzes/${quizId}`)
            .set("Authorization", `Bearer ${otherToken}`)
            .send({ title: "Hacked Title" });
        expect(res.status).toBe(403);
    });
});
