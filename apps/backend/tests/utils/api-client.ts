import request from "supertest";
import express from "express";
import { generateTestToken, type TestUser } from "./auth-helpers.js";

export function createTestApp(): express.Express {
    const app = express();
    app.use(express.json());
    return app;
}

export function authenticatedRequest(
    app: express.Express,
    user: TestUser
): request.Test {
    const token = generateTestToken(user);
    return request(app).set("Authorization", `Bearer ${token}`);
}

export function expectSuccess(response: request.Response, status = 200): void {
    expect(response.status).toBe(status);
    expect(response.body).toBeDefined();
}

export function expectError(response: request.Response, status: number, message?: string): void {
    expect(response.status).toBe(status);
    expect(response.body.errMsg || response.body.error).toBeDefined();
    if (message) {
        expect(response.body.errMsg || response.body.error).toContain(message);
    }
}