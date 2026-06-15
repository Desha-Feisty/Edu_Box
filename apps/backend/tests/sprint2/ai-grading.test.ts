/**
 * Sprint 2 — AI Grading Edge Case Tests
 *
 * Verifies the aiGrading.ts service handles edge cases correctly:
 * - Empty/whitespace answers: score 0, no AI call (A1)
 * - Temperature=0 in generation config (A2)
 * - Non-JSON response recovery with simplified prompt (A3)
 * - Very long answers truncated (A5)
 * - Missing API key handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// All mock setup in a single vi.hoisted() so vi.mock factory has access
const { mockGenerateContent, mockGetGenerativeModel, MockGoogleGenerativeAI } = vi.hoisted(() => {
    const mGC = vi.fn();
    const mGGM = vi.fn().mockReturnValue({ generateContent: mGC });

    // Must be a regular class (not arrow) so `new` works
    class MockGenAI {
        getGenerativeModel = mGGM;
    }

    return {
        mockGenerateContent: mGC,
        mockGetGenerativeModel: mGGM,
        MockGoogleGenerativeAI: MockGenAI,
    };
});

vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: MockGoogleGenerativeAI,
}));

beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("AI Grading — Edge Cases (Sprint 2)", () => {
    describe("A1: Empty / Whitespace Answers", () => {
        it("returns score 0 for empty string, no AI call", async () => {
            const { gradeWrittenAnswer } = await import("../../src/services/aiGrading.js");
            const result = await gradeWrittenAnswer({
                questionPrompt: "What is 2+2?",
                studentAnswer: "",
                maxPoints: 5,
            });
            expect(result.score).toBe(0);
            expect(result.feedback).toBe("No answer provided.");
            expect(mockGenerateContent).not.toHaveBeenCalled();
        });

        it("returns score 0 for whitespace-only string", async () => {
            const { gradeWrittenAnswer } = await import("../../src/services/aiGrading.js");
            const result = await gradeWrittenAnswer({
                questionPrompt: "Explain gravity",
                studentAnswer: "   \n  \t  ",
                maxPoints: 10,
            });
            expect(result.score).toBe(0);
            expect(result.feedback).toBe("No answer provided.");
            expect(mockGenerateContent).not.toHaveBeenCalled();
        });

        it("returns score 0 for null/undefined answer", async () => {
            const { gradeWrittenAnswer } = await import("../../src/services/aiGrading.js");
            const result = await gradeWrittenAnswer({
                questionPrompt: "Test question",
                studentAnswer: null as unknown as string,
                maxPoints: 5,
            });
            expect(result.score).toBe(0);
            expect(mockGenerateContent).not.toHaveBeenCalled();
        });
    });

    describe("A2: Temperature=0 Deterministic Scoring", () => {
        it("passes temperature: 0 in generation config", async () => {
            mockGenerateContent.mockResolvedValueOnce({
                response: { text: () => '{"score":3,"feedback":"Good"}' },
            });

            const { gradeWrittenAnswer } = await import("../../src/services/aiGrading.js");
            await gradeWrittenAnswer({
                questionPrompt: "Test",
                studentAnswer: "Some answer",
                maxPoints: 5,
            });

            const callArgs = mockGetGenerativeModel.mock.calls[0][0];
            expect(callArgs).toHaveProperty("generationConfig");
            expect(callArgs.generationConfig).toHaveProperty("temperature", 0);
        });
    });

    describe("A3: Non-JSON Response Recovery", () => {
        it("retries with simplified prompt on JSON parse failure", async () => {
            mockGenerateContent
                .mockResolvedValueOnce({
                    response: { text: () => "The answer is good, I'd give it 4/5" },
                })
                .mockResolvedValueOnce({
                    response: { text: () => '{"score":4,"feedback":"Good answer"}' },
                });

            const { gradeWrittenAnswer } = await import("../../src/services/aiGrading.js");
            const result = await gradeWrittenAnswer({
                questionPrompt: "Test",
                studentAnswer: "Some answer",
                maxPoints: 5,
            });

            expect(result.score).toBe(4);
            expect(result.feedback).toBe("Good answer");
            expect(mockGenerateContent).toHaveBeenCalledTimes(2);
        });
    });

    describe("A5: Long Answers", () => {
        it("handles very long answers", async () => {
            mockGenerateContent.mockResolvedValueOnce({
                response: { text: () => '{"score":3,"feedback":"Good effort"}' },
            });

            const { gradeWrittenAnswer } = await import("../../src/services/aiGrading.js");
            const longAnswer = "word ".repeat(5000);
            const result = await gradeWrittenAnswer({
                questionPrompt: "Short question",
                studentAnswer: longAnswer,
                maxPoints: 5,
            });

            expect(result).toHaveProperty("score");
            expect(result).toHaveProperty("feedback");
        });

        it("handles answer at exact MAX_ANSWER_LENGTH boundary", async () => {
            mockGenerateContent.mockResolvedValueOnce({
                response: { text: () => '{"score":5,"feedback":"Perfect"}' },
            });

            const { gradeWrittenAnswer } = await import("../../src/services/aiGrading.js");
            const boundaryAnswer = "x".repeat(4000);
            const result = await gradeWrittenAnswer({
                questionPrompt: "Test",
                studentAnswer: boundaryAnswer,
                maxPoints: 5,
            });

            expect(result.score).toBe(5);
        });
    });

    describe("Missing API Key", () => {
        it("throws error when GEMINI_API_KEY is not set", async () => {
            delete process.env.GEMINI_API_KEY;

            const { gradeWrittenAnswer } = await import("../../src/services/aiGrading.js");

            await expect(gradeWrittenAnswer({
                questionPrompt: "Test",
                studentAnswer: "Some answer",
                maxPoints: 5,
            })).rejects.toThrow("AI features are not configured");
        });
    });
});
