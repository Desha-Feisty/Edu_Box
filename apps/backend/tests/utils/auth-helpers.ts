import jwt from "jsonwebtoken";
import { Types } from "mongoose";

export interface TestUser {
    _id: string;
    role: "student" | "teacher" | "admin";
    email: string;
    name: string;
}

export function generateTestToken(user: TestUser): string {
    const secret = process.env.JWT_SECRET || "test-secret";
    return jwt.sign(
        { _id: user._id, role: user.role },
        secret,
        { expiresIn: "1h" }
    );
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
        _id: new Types.ObjectId().toString(),
        role: "student",
        email: "test@example.com",
        name: "Test User",
        ...overrides,
    };
}

export function createTeacher(overrides: Partial<TestUser> = {}): TestUser {
    return createTestUser({ role: "teacher", email: "teacher@example.com", name: "Test Teacher", ...overrides });
}

export function createStudent(overrides: Partial<TestUser> = {}): TestUser {
    return createTestUser({ role: "student", email: "student@example.com", name: "Test Student", ...overrides });
}

export function createAdmin(overrides: Partial<TestUser> = {}): TestUser {
    return createTestUser({ role: "admin", email: "admin@example.com", name: "Test Admin", ...overrides });
}