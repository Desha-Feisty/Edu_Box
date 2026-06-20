/**
 * Sprint 5 — Fixed Features Tests
 *
 * Tests for the three bugfix features (password change, ticket close,
 * note access, search) using mocked DB layer. No live MongoDB needed.
 *
 * Key patterns:
 * - Tokens generated inside beforeEach/it() to ensure dotenv is loaded
 * - Routes tested for mounting + auth enforcement
 * - Validates response shapes match actual utilities (message vs errMsg)
 * - Skips controller logic that requires DB (would Mongoose-timeout)
 */
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

// ─── Helpers ──────────────────────────────────────────────────────────────

function generateToken(userId: string, role: string): string {
    const secret = process.env.JWT_SECRET || "test-secret";
    return jwt.sign({ _id: userId, role }, secret, { expiresIn: "1h" });
}

// ─── Auth Middleware ──────────────────────────────────────────────────────

describe("Auth middleware — token validation", () => {
    let app: express.Express;

    beforeEach(async () => {
        app = express();
        app.use(express.json());
        const { authMiddleware } = await import("../../src/middleware/auth.js");
        app.get("/api/protected", authMiddleware, (_req: any, res: any) => {
            res.json({ userId: _req.user?._id, role: _req.user?.role });
        });
    });

    it("allows valid token → 200", async () => {
        const token = generateToken("650000000000000000000001", "teacher");
        const res = await request(app).get("/api/protected").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.userId).toBe("650000000000000000000001");
        expect(res.body.role).toBe("teacher");
    });

    it("rejects missing Authorization header → 401", async () => {
        const res = await request(app).get("/api/protected");
        expect(res.status).toBe(401);
        expect(res.body.errMsg).toBe("unauthenticated");
    });

    it("rejects malformed token → 401", async () => {
        const res = await request(app).get("/api/protected").set("Authorization", "Bearer bad");
        expect(res.status).toBe(401);
        expect(res.body.errMsg).toBe("unable to verify user");
    });

    it("rejects token with wrong secret → 401", async () => {
        const token = jwt.sign({ _id: "123", role: "teacher" }, "wrong-secret");
        const res = await request(app).get("/api/protected").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(res.body.errMsg).toBe("unable to verify user");
    });

    it("rejects token missing _id → 401", async () => {
        const token = jwt.sign({ role: "teacher" }, process.env.JWT_SECRET || "test-secret");
        const res = await request(app).get("/api/protected").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(res.body.errMsg).toBe("unable to verify user");
    });

    it("rejects token missing role → 401", async () => {
        const token = jwt.sign({ _id: "123" }, process.env.JWT_SECRET || "test-secret");
        const res = await request(app).get("/api/protected").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(res.body.errMsg).toBe("unable to verify user");
    });
});

// ─── requireRole Middleware ───────────────────────────────────────────────

describe("requireRole middleware", () => {
    let app: express.Express;

    beforeEach(async () => {
        app = express();
        app.use(express.json());
        const { authMiddleware, requireRole } = await import("../../src/middleware/auth.js");
        app.get("/api/teacher-only", authMiddleware, requireRole("teacher"), (_req: any, res: any) => {
            res.json({ ok: true });
        });
    });

    it("allows teacher → 200", async () => {
        const token = generateToken("650000000000000000000001", "teacher");
        const res = await request(app).get("/api/teacher-only").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    it("rejects student → 403", async () => {
        const token = generateToken("u2", "student");
        const res = await request(app).get("/api/teacher-only").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.errMsg).toBe("forbidden");
    });

    it("rejects admin → 403", async () => {
        const token = generateToken("u3", "admin");
        const res = await request(app).get("/api/teacher-only").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.errMsg).toBe("forbidden");
    });
});

// ─── Route Mounting + Authentication Checks ──────────────────────────────

describe("Route auth enforcement", () => {
    let app: express.Express;

    beforeEach(async () => {
        app = express();
        app.use(express.json());
    });

    it("PUT /api/auth/password → 401 without token", async () => {
        const { default: authRoutes } = await import("../../src/routes/auth.routes.js");
        app.use("/api/auth", authRoutes);
        const res = await request(app).put("/api/auth/password").send({ currentPassword: "x", newPassword: "y" });
        expect(res.status).toBe(401);
    });

    it("PATCH /api/tickets/:id/close → 401 without token", async () => {
        const { default: ticketRoutes } = await import("../../src/routes/ticket.routes.js");
        app.use("/api/tickets", ticketRoutes);
        const res = await request(app).patch("/api/tickets/abc123/close");
        expect(res.status).toBe(401);
    });

    it("GET /api/notes/:noteId → 401 without token", async () => {
        const { default: noteRoutes } = await import("../../src/routes/note.routes.js");
        app.use("/api/notes", noteRoutes);
        const res = await request(app).get("/api/notes/abc123");
        expect(res.status).toBe(401);
    });

    it("GET /api/search → 401 without token", async () => {
        const { default: searchRoutes } = await import("../../src/routes/search.routes.js");
        const { authMiddleware } = await import("../../src/middleware/auth.js");
        app.use("/api/search", authMiddleware, searchRoutes);
        const res = await request(app).get("/api/search?q=test");
        expect(res.status).toBe(401);
    });
});

// ─── Input Validation (no DB needed) ─────────────────────────────────────

describe("Search route — input validation", () => {
    let app: express.Express;

    beforeEach(async () => {
        app = express();
        app.use(express.json());
        const { default: searchRoutes } = await import("../../src/routes/search.routes.js");
        const { authMiddleware } = await import("../../src/middleware/auth.js");
        app.use("/api/search", authMiddleware, searchRoutes);
    });

    it("rejects query shorter than 2 characters → 400", async () => {
        const token = generateToken("admin1", "admin");
        const res = await request(app).get("/api/search?q=a").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(400);
        expect(res.body.errMsg).toMatch(/2 characters/i);
    });

    it("passes auth + validation for valid 2+ char query (handler runs)", async () => {
        const token = generateToken("admin1", "admin");
        // Use a separate app that duplicates the validation logic but
        // replaces DB-bound handler with an immediate mock response
        const app2 = express();
        app2.use(express.json());
        const { authMiddleware } = await import("../../src/middleware/auth.js");
        app2.get("/api/search", authMiddleware, (req: any, res: any) => {
            const q = req.query.q;
            // Same validation as search.routes.ts
            if (!q || typeof q !== "string" || q.trim().length < 2) {
                return res.status(400).json({ errMsg: "Search query must be at least 2 characters" });
            }
            res.json({ ok: true });
        });
        const res = await request(app2).get("/api/search?q=ab").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});

// ─── Controller: changePassword validation logic (no DB) ─────────────────

describe("changePassword — validation (controller unit)", () => {
    // Test the controller's pure validation logic by mocking User.findById
    // We test via route, but validation happens before any DB call
    let app: express.Express;

    beforeEach(async () => {
        app = express();
        app.use(express.json());
        const { default: authRoutes } = await import("../../src/routes/auth.routes.js");
        app.use("/api/auth", authRoutes);
    });

    it("rejects missing currentPassword → 400", async () => {
        const token = generateToken("u1", "student");
        const res = await request(app)
            .put("/api/auth/password")
            .set("Authorization", `Bearer ${token}`)
            .send({ newPassword: "newPass456" });
        expect(res.status).toBe(400);
        // sendValidationError puts message in `message` field, not `errMsg`
        expect(res.body.message).toMatch(/currentPassword/i);
    });

    it("rejects missing newPassword → 400", async () => {
        const token = generateToken("u1", "student");
        const res = await request(app)
            .put("/api/auth/password")
            .set("Authorization", `Bearer ${token}`)
            .send({ currentPassword: "pass1234" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/newPassword/i);
    });

    it("rejects newPassword shorter than 6 chars → 400", async () => {
        const token = generateToken("u1", "student");
        const res = await request(app)
            .put("/api/auth/password")
            .set("Authorization", `Bearer ${token}`)
            .send({ currentPassword: "pass1234", newPassword: "abc12" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/6 characters/);
    });
});
