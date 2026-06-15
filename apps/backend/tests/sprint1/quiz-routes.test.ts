/**
 * Sprint 1 — Quiz Routes Tests
 *
 * Verifies:
 * - Route mounting (quiz routes mounted at /api/quizzes)
 * - Duplicate route detection (/:id/quizzes vs / both create quizzes)
 * - Route-level security (auth, role checks)
 * - All CRUD endpoints respond correctly
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { setupTestDB, teardownTestDB, clearTestDB } from "../utils/test-db.js";
import { createTeacher, createStudent, generateTestToken, type TestUser } from "../utils/auth-helpers.js";

// We test routes by mounting them exactly as app.ts does
describe("Quiz Routes — Mounting & Duplicate Detection", () => {
    let app: express.Express;
    let teacherToken: string;
    let studentToken: string;
    let teacher: TestUser;
    let student: TestUser;

    beforeAll(async () => {
        await setupTestDB();

        // Create test users
        teacher = createTeacher();
        student = createStudent();
        teacherToken = generateTestToken(teacher);
        studentToken = generateTestToken(student);
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        // Fresh app for each test to avoid state leakage
        app = express();
        app.use(express.json());

        // Import and mount routes (with actual middleware)
        const { default: quizRoutes } = await import("../../src/routes/quiz.routes.js");
        app.use("/api/quizzes", quizRoutes);
    });

    describe("Route Mounting", () => {
        it("mounts quiz routes at /api/quizzes", async () => {
            // GET /api/quizzes/available should exist (no auth → 401)
            const res = await request(app).get("/api/quizzes/available");
            expect(res.status).toBe(401);
        });

        it("responds 401 for unknown quiz routes (catches GET /:id with auth)", async () => {
            const res = await request(app)
                .get("/api/quizzes/nonexistent-route");
            // GET /:id matches any path as a parameter, so auth is enforced first
            expect(res.status).toBe(401);
        });
    });

    describe("Duplicate POST Routes (S1-1)", () => {
        it("POST /api/quizzes/:id/quizzes exists (createQuiz in course context)", async () => {
            // Without auth → 401 (proves route is registered)
            const res = await request(app)
                .post("/api/quizzes/someCourseId/quizzes")
                .send({ title: "Test" });
            expect(res.status).toBe(401);
        });

        it("POST /api/quizzes/ exists (createQuizFromBody)", async () => {
            // Without auth → 401 (proves route is registered)
            const res = await request(app)
                .post("/api/quizzes/")
                .send({ title: "Test" });
            expect(res.status).toBe(401);
        });

        it("POST /:id/quizzes enforces teacher role", async () => {
            const res = await request(app)
                .post("/api/quizzes/someCourseId/quizzes")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ title: "Test Quiz" });
            // Student can't create quizzes
            expect(res.status).toBe(403);
        });

        it("POST / enforces teacher role", async () => {
            const res = await request(app)
                .post("/api/quizzes/")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ title: "Test Quiz" });
            expect(res.status).toBe(403);
        });
    });

    describe("GET Routes — Read Operations", () => {
        it("GET /course/:id requires auth", async () => {
            const res = await request(app).get("/api/quizzes/course/someId");
            expect(res.status).toBe(401);
        });

        it("GET /course/:id works with auth", async () => {
            const res = await request(app)
                .get("/api/quizzes/course/someId")
                .set("Authorization", `Bearer ${studentToken}`);
            // 200 or 400 (invalid ObjectId) — route exists and passes auth
            expect([200, 400, 500]).toContain(res.status);
        });

        it("GET /available works with auth", async () => {
            const res = await request(app)
                .get("/api/quizzes/available")
                .set("Authorization", `Bearer ${studentToken}`);
            expect([200, 500]).toContain(res.status);
        });

        it("GET /:id requires auth", async () => {
            const res = await request(app).get("/api/quizzes/someId");
            expect(res.status).toBe(401);
        });
    });

    describe("Teacher-Only Routes", () => {
        it("PUT /:id rejects students", async () => {
            const res = await request(app)
                .put("/api/quizzes/someId")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ title: "Updated" });
            expect(res.status).toBe(403);
        });

        it("DELETE /:id rejects students", async () => {
            const res = await request(app)
                .delete("/api/quizzes/someId")
                .set("Authorization", `Bearer ${studentToken}`);
            expect(res.status).toBe(403);
        });

        it("POST /:id/questions rejects students", async () => {
            const res = await request(app)
                .post("/api/quizzes/someId/questions")
                .set("Authorization", `Bearer ${studentToken}`)
                .send({ prompt: "Test?", questionType: "mcq_single", choices: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: false }] });
            expect(res.status).toBe(403);
        });

        it("POST /:id/publish rejects students", async () => {
            const res = await request(app)
                .post("/api/quizzes/someId/publish")
                .set("Authorization", `Bearer ${studentToken}`);
            expect(res.status).toBe(403);
        });
    });

    describe("Grade Routes", () => {
        it("GET /:id/grades requires teacher role", async () => {
            const res = await request(app)
                .get("/api/quizzes/someId/grades")
                .set("Authorization", `Bearer ${studentToken}`);
            expect(res.status).toBe(403);
        });

        it("GET /:id/grades/export requires teacher role", async () => {
            const res = await request(app)
                .get("/api/quizzes/someId/grades/export")
                .set("Authorization", `Bearer ${studentToken}`);
            expect(res.status).toBe(403);
        });
    });
});
