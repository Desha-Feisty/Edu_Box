import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

import authRoutes from "../src/routes/auth.routes.js";
import courseRoutes from "../src/routes/course.routes.js";
import quizRoutes from "../src/routes/quiz.routes.js";
import attemptRoutes from "../src/routes/attempt.routes.js";
import chatRoutes from "../src/routes/chat.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/chats", chatRoutes);

describe("Integration Tests", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test_schoolapp");
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    it("should register teacher", async () => {
        const uniqueEmail = `teacher${Date.now()}@test.com`;
        const res = await request(app)
            .post("/api/auth/register")
            .send({ name: "Teacher1", email: uniqueEmail, password: "pass1234", role: "teacher" });
        expect(res.status).toBe(201);
    }, 30000);

    it("should register student", async () => {
        const uniqueEmail = `student${Date.now()}@test.com`;
        const res = await request(app)
            .post("/api/auth/register")
            .send({ name: "Student1", email: uniqueEmail, password: "pass1234", role: "student" });
        expect(res.status).toBe(201);
    }, 30000);
});
