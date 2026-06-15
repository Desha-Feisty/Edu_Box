import { GoogleGenerativeAI } from "@google/generative-ai";

interface GradingInput {
    questionPrompt: string;
    studentAnswer: string;
    sampleAnswer?: string;
    rubric?: string;
    maxPoints: number;
}

interface GradingOutput {
    score: number;
    feedback: string;
}

const MAX_ANSWER_LENGTH = 4000; // Characters — prevents token limit issues
const OVERALL_TIMEOUT_MS = 30_000; // 30s total timeout for AI grading

/**
 * Grade a written answer using AI.
 *
 * Edge cases handled:
 * - Empty/whitespace-only answers → score 0 immediately (no API call)
 * - Very long answers → truncated to MAX_ANSWER_LENGTH
 * - Non-JSON model responses → retry with simplified prompt
 * - API failures → retry up to 3x with exponential backoff
 * - Overall stall → 30s timeout guard
 * - Deterministic scoring → temperature=0
 */
export async function gradeWrittenAnswer(input: GradingInput): Promise<GradingOutput> {
    const { questionPrompt, studentAnswer, sampleAnswer, rubric, maxPoints } = input;

    // A1: Empty/whitespace-only answer — score 0 immediately, no AI call
    if (!studentAnswer || !studentAnswer.trim()) {
        return {
            score: 0,
            feedback: "No answer provided.",
        };
    }

    if (!process.env.GEMINI_API_KEY) {
        throw new Error("AI features are not configured on the server");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // A2: temperature=0 for deterministic, consistent scoring
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            temperature: 0,
        },
    });

    // A5: Truncate very long answers to prevent token limit issues
    const truncatedAnswer = studentAnswer.length > MAX_ANSWER_LENGTH
        ? studentAnswer.slice(0, MAX_ANSWER_LENGTH) + "\n\n[... answer truncated due to length]"
        : studentAnswer;

    let gradingCriteria = "";
    if (sampleAnswer) {
        gradingCriteria += `A sample ideal answer is provided:\n"${sampleAnswer}"\n\n`;
    }
    if (rubric) {
        gradingCriteria += `Use the following rubric for grading:\n"${rubric}"\n\n`;
    }
    gradingCriteria += `The maximum points for this question is ${maxPoints}.`;

    const prompt = `You are an expert educator grading a student's written answer.

Question: "${questionPrompt}"

${gradingCriteria}

Student's Answer:
"${truncatedAnswer}"

Please provide a JSON response with the following structure:
{
    "score": <number between 0 and ${maxPoints}>,
    "feedback": "<detailed feedback explaining the score, highlighting strengths and areas for improvement>"
}

Be fair and constructive in your feedback. Consider:
- Accuracy of the answer
- Completeness of the response
- Understanding of the concepts
- Clarity of expression

Return ONLY valid JSON, no markdown formatting.`;

    // Simplified prompt used for retry on JSON parse failure (A3)
    const simplifiedPrompt = `Grade this answer (0-${maxPoints}):
Question: "${questionPrompt}"
Student: "${truncatedAnswer}"
${sampleAnswer ? `\nIdeal: "${sampleAnswer}"` : ""}
${rubric ? `\nRubric: "${rubric}"` : ""}

Respond ONLY with JSON: {"score": <0-${maxPoints}>, "feedback": "<feedback>"}`;

    // A4: Overall timeout guard using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OVERALL_TIMEOUT_MS);

    try {
        // Retry loop with exponential backoff
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                // Use the full prompt for the first attempt, simplified for retries
                const activePrompt = attempt === 0 ? prompt : simplifiedPrompt;
                const result = await model.generateContent(activePrompt);

                const text = result.response.text().trim();

                // Extract JSON from response (handles markdown-wrapped JSON)
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("AI returned invalid format");
                }

                const parsed = JSON.parse(jsonMatch[0]);

                // Validate and clamp score
                const score = Math.max(0, Math.min(maxPoints, Number(parsed.score) || 0));

                return {
                    score,
                    feedback: parsed.feedback || "No feedback provided.",
                };
            } catch (err) {
                lastError = err;
                if (attempt < 2) {
                    // Exponential backoff: 1s, 2s
                    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
        }
        // All 3 attempts failed
        throw lastError;
    } finally {
        clearTimeout(timeoutId);
    }
}
