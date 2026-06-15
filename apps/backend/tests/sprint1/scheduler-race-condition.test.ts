/**
 * Sprint 1 — Scheduler Race Condition Tests
 *
 * Verifies that the quiz scheduler's atomic update prevents
 * duplicate processing when multiple cron jobs or concurrent
 * requests try to auto-submit the same attempt.
 *
 * The scheduler (quizScheduler.ts lines 58-75) uses:
 * ```
 * const result = await Attempt.updateOne(
 *   { _id: attempt._id, status: "inProgress" },
 *   { $set: { status: "late"|"submitted", submittedAt: now } }
 * );
 * if (result.modifiedCount === 0) continue; // Skip if already processed
 * ```
 *
 * This test validates that concurrent submissions result in
 * exactly one successful update (idempotency).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose, { Types } from "mongoose";
import dayjs from "dayjs";
import { setupTestDB, teardownTestDB, clearTestDB } from "../utils/test-db.js";
import { createTestQuiz, createTestAttempt, createTestCourse } from "../utils/factory.js";
import Attempt from "../../src/models/attempt.js";
import Quiz from "../../src/models/quiz.js";
import Course from "../../src/models/course.js";

describe("Scheduler Race Condition — Atomic Auto-Submit (S1-5)", () => {
    let attemptId: Types.ObjectId;

    beforeAll(async () => {
        await setupTestDB();
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();

        // Create a course + quiz + in-progress attempt that has expired
        const course = await Course.create(createTestCourse());
        const quiz = await Quiz.create(createTestQuiz({ course: course._id }));
        const pastEndAt = dayjs().subtract(5, "minute").toDate();

        const attempt = await Attempt.create(
            createTestAttempt({
                quiz: quiz._id,
                user: new Types.ObjectId(),
                status: "inProgress",
                endAt: pastEndAt,
                startAt: dayjs().subtract(1, "hour").toDate(),
                responses: [],
            })
        );
        attemptId = attempt._id as Types.ObjectId;
    });

    it("S1-5: concurrent auto-submit results in exactly one success (idempotency)", async () => {
        const now = dayjs().toDate();
        const numConcurrent = 5; // Simulate 5 concurrent cron ticks

        const results = await Promise.all(
            Array.from({ length: numConcurrent }, () =>
                Attempt.updateOne(
                    {
                        _id: attemptId,
                        status: "inProgress", // Only update if still in progress
                    },
                    {
                        $set: {
                            status: "late",
                            submittedAt: now,
                        },
                    }
                )
            )
        );

        // Exactly ONE should have modifiedCount === 1
        const successes = results.filter(r => r.modifiedCount === 1);
        expect(successes.length).toBe(1);

        // All others should have modifiedCount === 0
        const failures = results.filter(r => r.modifiedCount === 0);
        expect(failures.length).toBe(numConcurrent - 1);

        // Verify the attempt is no longer inProgress
        const updatedAttempt = await Attempt.findById(attemptId).lean();
        expect(updatedAttempt).not.toBeNull();
        if (updatedAttempt) {
            expect(updatedAttempt.status).not.toBe("inProgress");
        }
    });

    it("second call to updateOne is idempotent after first success", async () => {
        const now = dayjs().toDate();

        // First call: should succeed
        const first = await Attempt.updateOne(
            { _id: attemptId, status: "inProgress" },
            { $set: { status: "late", submittedAt: now } }
        );
        expect(first.modifiedCount).toBe(1);

        // Second call: should do nothing (already processed)
        const second = await Attempt.updateOne(
            { _id: attemptId, status: "inProgress" },
            { $set: { status: "late", submittedAt: now } }
        );
        expect(second.modifiedCount).toBe(0);

        // Third call: also nothing
        const third = await Attempt.updateOne(
            { _id: attemptId, status: "inProgress" },
            { $set: { status: "late", submittedAt: now } }
        );
        expect(third.modifiedCount).toBe(0);
    });

    it("gradeSubmittedAttempt is idempotent when called multiple times", async () => {
        // Import the grading function
        const { gradeSubmittedAttempt } = await import("../../src/controllers/attempt.controller.js");

        // First call: should grade (or skip if no questions to grade)
        // Catch any errors as this depends on attempt state
        let firstError: Error | null = null;
        try {
            await gradeSubmittedAttempt({ _id: attemptId });
        } catch (err: any) {
            firstError = err;
        }

        // Second call with same attempt: should skip (status already "graded" or no change)
        let secondError: Error | null = null;
        try {
            await gradeSubmittedAttempt({ _id: attemptId });
        } catch (err: any) {
            secondError = err;
        }

        // Both should succeed or handle state gracefully
        // The gradeSubmittedAttempt function has try/catch internally
        expect(firstError).toBeNull();
        expect(secondError).toBeNull();
    });

    it("gradeSubmittedAttempt skips if status is already graded", async () => {
        const { gradeSubmittedAttempt } = await import("../../src/controllers/attempt.controller.js");

        // Set attempt to graded state
        await Attempt.findByIdAndUpdate(attemptId, {
            status: "graded",
            score: 10,
            maxScore: 10,
        });

        // This should return early without modifying
        const result = await gradeSubmittedAttempt({ _id: attemptId });

        // Status should remain graded
        const attempt = await Attempt.findById(attemptId).lean();
        expect(attempt?.status).toBe("graded");
    });

    it("concurrent scheduler + student manual submit race", async () => {
        const now = dayjs().toDate();

        // Simulate concurrent: scheduler tries to auto-submit while student manually submits
        const [schedulerResult, studentSubmitResult] = await Promise.all([
            // Scheduler: atomic conditional update
            Attempt.updateOne(
                { _id: attemptId, status: "inProgress" },
                { $set: { status: "late", submittedAt: now } }
            ),
            // Student manually submits via the same pattern
            Attempt.updateOne(
                { _id: attemptId, status: "inProgress" },
                { $set: { status: "submitted", submittedAt: now } }
            ),
        ]);

        // Exactly one should win
        const totalModified = schedulerResult.modifiedCount + studentSubmitResult.modifiedCount;
        expect(totalModified).toBe(1);

        // Verify the attempt is no longer inProgress
        const updatedAttempt = await Attempt.findById(attemptId).lean();
        expect(updatedAttempt).not.toBeNull();
        if (updatedAttempt) {
            expect(updatedAttempt.status).not.toBe("inProgress");
            // Should be either "late" or "submitted" depending on which won
            expect(["late", "submitted"]).toContain(updatedAttempt.status);
        }
    });
});

describe("Scheduler — Batch Expired Attempts (S1-5)", () => {
    beforeAll(async () => {
        await setupTestDB();
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
    });

    it("multiple expired attempts can be processed independently", async () => {
        // Create several expired attempts
        const pastEndAt = dayjs().subtract(10, "minute").toDate();
        const now = dayjs().toDate();
        const course = await Course.create(createTestCourse());
        const quiz1 = await Quiz.create(createTestQuiz({ course: course._id }));
        const quiz2 = await Quiz.create(createTestQuiz({ course: course._id }));

        const ids = await Promise.all([
            Attempt.create(createTestAttempt({
                quiz: quiz1._id, user: new Types.ObjectId(),
                status: "inProgress", endAt: pastEndAt, responses: [],
            })),
            Attempt.create(createTestAttempt({
                quiz: quiz1._id, user: new Types.ObjectId(),
                status: "inProgress", endAt: pastEndAt, responses: [],
            })),
            Attempt.create(createTestAttempt({
                quiz: quiz2._id, user: new Types.ObjectId(),
                status: "inProgress", endAt: pastEndAt, responses: [],
            })),
        ]);

        // Process all concurrently (simulating multiple cron workers)
        const results = await Promise.all(
            ids.map(a =>
                Attempt.updateOne(
                    { _id: a._id, status: "inProgress" },
                    { $set: { status: "late", submittedAt: now } }
                )
            )
        );

        // All should succeed (different documents)
        expect(results.every(r => r.modifiedCount === 1)).toBe(true);

        // Verify all are now late
        const updated = await Attempt.find({ _id: { $in: ids.map(a => a._id) } }).lean();
        expect(updated.every(a => a.status === "late")).toBe(true);
    });
});
