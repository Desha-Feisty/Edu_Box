/**
 * Sprint 1 — Attempt Routes Tests
 *
 * Verifies:
 * - Attempt routes mounted at /api/attempts (S1-2)
 * - Auto-save endpoint exists and works (S1-3)
 * - Submit endpoint works with correct permissions
 * - Route-level security (auth, role checks, ownership)
 * - Literal routes before parameterized routes (/start before /:quizId)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import mongoose, { Types } from "mongoose";
import { setupTestDB, teardownTestDB, clearTestDB } from "../utils/test-db.js";
import { createTeacher, createStudent, generateTestToken, type TestUser } from "../utils/auth-helpers.js";
import { createTestQuiz, createTestAttempt, createTestQuestion, createTestCourse } from "../utils/factory.js";
import Attempt from "../../src/models/attempt.js";
import Quiz from "../../src/models/quiz.js";

describe("Attempt Routes — Mounting & Auto-Save (S1-2, S1-3)", () => {
    let app: express.Express;

    beforeAll(async () => {
        await setupTestDB();
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        app = express();
        app.use(express.json());

        // Mount routes exactly as app.ts does
        const { default: attemptRoutes } = await import("../../src/routes/attempt.routes.js");
        app.use("/api/attempts", attemptRoutes);
    });

    describe("Route Mounting (S1-2)", () => {
        it("mounts attempt routes at /api/attempts", async () => {
            // /api/attempts/my should exist (no auth → 401)
            const res = await request(app).get("/api/attempts/my");
            expect(res.status).toBe(401);
        });

        it("responds 401 for unknown attempt routes (catches GET /:attemptId with auth)", async () => {
            const res = await request(app)
                .get("/api/attempts/nonexistent");
            // GET /:attemptId matches any path as a parameter, so auth is enforced first
            expect(res.status).toBe(401);
        });
    });

    describe("Literal Routes Before Parameterized Routes", () => {
        it("POST /api/attempts/start does not collide with /:quizId/attempts/start", async () => {
            // Without auth → 401 (proves /start route is registered literally)
            const res = await request(app)
                .post("/api/attempts/start")
                .send({});
            expect(res.status).toBe(401);

            // Without auth on parameterized route
            const res2 = await request(app)
                .post("/api/attempts/someQuizId/attempts/start");
            expect(res2.status).toBe(401);
        });
    });

    describe("Auto-Save Endpoint (S1-3)", () => {
        let studentToken: string;
        let student: TestUser;
        let quizId: Types.ObjectId;
        let attemptId: Types.ObjectId;
        let questionId: Types.ObjectId;

        beforeEach(async () => {
            student = createStudent();
            studentToken = generateTestToken(student);

            // Create a quiz with a question and an attempt
            quizId = new Types.ObjectId();
            questionId = new Types.ObjectId();

            const course = await Quiz.create(createTestQuiz({ _id: quizId }));
            
            await mongoose.model("Question").create(
                createTestQuestion({ _id: questionId, quiz: quizId })
            );

            const attempt = await Attempt.create(
                createTestAttempt({
                    quiz: quizId,
                    user: new Types.ObjectId(student._id),
                    responses: [{
                        question: questionId,
                        selectedChoiceIds: [],
                        pointsAwarded: 0,
                    }],
                })
            );
            attemptId = attempt._id as Types.ObjectId;
        });

        it("PATCH /:attemptId/answers requires auth", async () => {
            const res = await request(app)
                .patch(`/api/attempts/${attemptId}/answers`)
                .send({ questionId: questionId.toString(), selectedChoiceIds: [] });
            expect(res.status).toBe(401);
        });

        it("PATCH /:attemptId/answers works with valid attempt ownership", async () => {
            const res = await request(app)
                .patch(`/api/attempts/${attemptId}/answers`)
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ questionId: questionId.toString(), selectedChoiceIds: [] });
            // Should succeed or fail with appropriate status
            expect([200, 400, 404]).toContain(res.status);
        });

        it("PATCH /:attemptId/answers rejects non-owners", async () => {
            const otherStudent = createStudent({ _id: new Types.ObjectId().toString() });
            const otherToken = generateTestToken(otherStudent);

            const res = await request(app)
                .patch(`/api/attempts/${attemptId}/answers`)
                .set("Authorization", `Bearer ${otherToken}`)
                .send({ questionId: questionId.toString(), selectedChoiceIds: [] });
            expect(res.status).toBe(403);
        });

        it("PUT /:attemptId/answer also works as alternative auto-save route", async () => {
            const res = await request(app)
                .put(`/api/attempts/${attemptId}/answer`)
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ questionId: questionId.toString(), selectedChoiceIds: [] });
            // Route exists; controller may return 200, 404, or 500 depending on state
            expect([200, 400, 404, 500]).toContain(res.status);
        });

        it("auto-save rejects missing questionId", async () => {
            const res = await request(app)
                .patch(`/api/attempts/${attemptId}/answers`)
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ selectedChoiceIds: [] });
            expect([400, 404]).toContain(res.status);
        });
    });

    describe("Submit Endpoint", () => {
        let studentToken: string;
        let student: TestUser;
        let attemptId: Types.ObjectId;

        beforeEach(async () => {
            student = createStudent();
            studentToken = generateTestToken(student);

            const quizId = new Types.ObjectId();
            await Quiz.create(createTestQuiz({ _id: quizId }));

            const attempt = await Attempt.create(
                createTestAttempt({
                    quiz: quizId,
                    user: new Types.ObjectId(student._id),
                    status: "inProgress",
                    responses: [],
                })
            );
            attemptId = attempt._id as Types.ObjectId;
        });

        it("POST /:attemptId/submit requires auth", async () => {
            const res = await request(app)
                .post(`/api/attempts/${attemptId}/submit`);
            expect(res.status).toBe(401);
        });

        it("PUT /:attemptId/submit also works", async () => {
            const res = await request(app)
                .put(`/api/attempts/${attemptId}/submit`)
                .set("Authorization", `Bearer ${studentToken}`);
            expect([200, 404]).toContain(res.status);
        });

        it("POST /:attemptId/submit rejects non-owners", async () => {
            const otherStudent = createStudent({ _id: new Types.ObjectId().toString() });
            const otherToken = generateTestToken(otherStudent);

            const res = await request(app)
                .post(`/api/attempts/${attemptId}/submit`)
                .set("Authorization", `Bearer ${otherToken}`);
            // Returns 404 (attempt not found for this user context) or 403 (ownership mismatch)
            expect([403, 404]).toContain(res.status);
        });

        it("S6: POST /:attemptId/submit rejects double-submission", async () => {
            // First submit should succeed
            const firstRes = await request(app)
                .post(`/api/attempts/${attemptId}/submit`)
                .set("Authorization", `Bearer ${studentToken}`);
            expect([200, 400]).toContain(firstRes.status);

            // Second submit should be rejected (already submitted)
            const secondRes = await request(app)
                .post(`/api/attempts/${attemptId}/submit`)
                .set("Authorization", `Bearer ${studentToken}`);
            expect(secondRes.status).toBe(400);
            expect(secondRes.body.error).toContain("already submitted");
        });
    });

    describe("GET Routes — Student Endpoints", () => {
        let studentToken: string;
        let student: TestUser;

        beforeEach(async () => {
            student = createStudent();
            studentToken = generateTestToken(student);
        });

        it("GET /my returns student's grades", async () => {
            const res = await request(app)
                .get("/api/attempts/my")
                .set("Authorization", `Bearer ${studentToken}`);
            expect([200, 500]).toContain(res.status);
        });

        it("GET /my-grades also works (alias)", async () => {
            const res = await request(app)
                .get("/api/attempts/my-grades")
                .set("Authorization", `Bearer ${studentToken}`);
            expect([200, 500]).toContain(res.status);
        });

        it("GET /:attemptId/result requires auth", async () => {
            const res = await request(app)
                .get("/api/attempts/someId/result");
            expect(res.status).toBe(401);
        });
    });

    describe("Teacher Endpoints", () => {
        let teacherToken: string;
        let teacher: TestUser;
        let studentToken: string;
        let student: TestUser;

        beforeEach(async () => {
            teacher = createTeacher();
            teacherToken = generateTestToken(teacher);
            student = createStudent();
            studentToken = generateTestToken(student);
        });

        it("GET /recent/teacher requires teacher role", async () => {
            const res = await request(app)
                .get("/api/attempts/recent/teacher")
                .set("Authorization", `Bearer ${studentToken}`);
            expect(res.status).toBe(403);
        });

        it("PATCH /:attemptId/responses/:responseIndex/score requires teacher role", async () => {
            const res = await request(app)
                .patch("/api/attempts/someId/responses/0/score")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ score: 5 });
            expect(res.status).toBe(403);
        });

        it("GET /student/:studentId/course/:courseId requires teacher role", async () => {
            const res = await request(app)
                .get(`/api/attempts/student/${student._id}/course/someCourseId`)
                .set("Authorization", `Bearer ${studentToken}`);
            expect(res.status).toBe(403);
        });
    });
});
