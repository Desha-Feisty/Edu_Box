import Joi from "joi";
import type { Response } from "express";
import type { AuthRequest } from "../types/authRequest.js";
import Attempt from "../models/attempt.js";
import Quiz from "../models/quiz.js";
import Course from "../models/course.js";
import Question from "../models/question.js";
import type { IQuestion } from "../models/question.js";
import Enrollment from "../models/enrollment.js";
import dayjs from "dayjs";
import { Types } from "mongoose";
import { gradeWrittenAnswer } from "../services/aiGrading.js";
import { logActivity } from "../services/logger.js";

const ensureEnrollment = async (userId: string, courseId: string) => {
    const enrolled = await Enrollment.findOne({
        user: userId,
        course: courseId,
    });
    return !!enrolled && enrolled.status === "active";
};

const countAttempts = async (userId: string, quizId: string) => {
    return Attempt.countDocuments({ user: userId, quiz: quizId });
};

// Seeded PRNG (Mulberry32) — deterministic, fast, good distribution
const mulberry32 = (seed: number) => {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

// Hash a string to a 32-bit integer seed
const hashString = (str: string): number => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return h;
};

// Fisher-Yates shuffle with seeded PRNG for deterministic random selection
const selectRandomQuestions = (allQuestions: any[], count: number, seed: string): any[] => {
    const shuffled = [...allQuestions];
    const rng = mulberry32(hashString(seed));

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
};

const startAttempt = async (req: AuthRequest, res: Response) => {
    try {
        const { quizId } = req.params;
        
        if (!quizId) {
            return res.status(400).json({ errMsg: "invalid quiz id" });
        }
        
        // Validate quizId format
        if (!quizId.match(/^[0-9a-fA-F]{24}$/)) {
            
            return res.status(400).json({ errMsg: "Invalid quiz ID format" });
        }
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ errMsg: "quiz not found" });
        }
        
        
        const now = dayjs();
        if (!quiz.published) {
            return res.status(400).json({ errMsg: "quiz unavailable" });
        }
        if (now.isBefore(dayjs(quiz.openAt))) {
            return res.status(400).json({ errMsg: "quiz not open yet" });
        }
        if (now.isAfter(dayjs(quiz.closeAt))) {
            return res.status(400).json({ errMsg: "quiz is closed" });
        }
        if (!req.user || !req.user._id) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }

        // Parallel execution for performance
        const [enrolled, expiredResult] = await Promise.all([
            ensureEnrollment(req.user._id, quiz.course.toString()),
            Attempt.updateMany(
                {
                    user: req.user._id,
                    quiz: quiz._id,
                    status: "inProgress",
                    endAt: { $lte: now.toDate() },
                },
                { $set: { status: "expired" } },
            ),
        ]);

        if (!enrolled) {
            return res.status(403).json({ errMsg: "not enrolled in course" });
        }

        const activeAttempt = await Attempt.findOne({
            user: req.user._id,
            quiz: quiz._id,
            status: "inProgress",
            endAt: { $gt: now.toDate() },
        }).lean();
        if (activeAttempt) {
            // Get all questions and apply random selection if needed
            let allQuestions = await Question.find({ quiz: quiz._id })
                .sort({ orderIndex: 1 })
                .lean();
            
            let questions = allQuestions;
            if (quiz.questionsPerAttempt && quiz.questionsPerAttempt < allQuestions.length) {
                questions = selectRandomQuestions(
                    allQuestions, 
                    quiz.questionsPerAttempt, 
                    `${req.user._id}-${activeAttempt._id}`
                );
            }
            
            return res.status(200).json({
                attemptId: activeAttempt._id,
                endAt: activeAttempt.endAt,
                questions: questions.map((q) => ({
                    _id: q._id,
                    prompt: q.prompt,
                    questionType: q.questionType,
                    points: q.points,
                    choices: q.questionType === "written" ? [] : q.choices.map((c) => ({
                        _id: c._id,
                        text: c.text,
                    })),
                })),
            });
        }
        const taken = await countAttempts(req.user._id, quizId);
        if (taken >= (quiz.attemptsAllowed || 1)) {
            return res.status(400).json({
                errMsg: `Attempts exhausted (${taken}/${
                    quiz.attemptsAllowed || 1
                } used)`,
            });
        }
        const durationEnd = now.add(quiz.durationMinutes, "minute");
        const quizEnd = dayjs(quiz.closeAt);
        const endAt = durationEnd.isBefore(quizEnd)
            ? durationEnd.toDate()
            : quizEnd.toDate();
        
        // Get all questions
        let allQuestions = await Question.find({ quiz: quiz._id })
            .sort({ orderIndex: 1 })
            .lean();
        
        // Defensive check: no questions in quiz
        if (!allQuestions || allQuestions.length === 0) {
            return res.status(400).json({ errMsg: "This quiz has no questions yet" });
        }
        
        // Select random subset if questionsPerAttempt is set
        let questions = allQuestions;
        if (quiz.questionsPerAttempt && quiz.questionsPerAttempt < allQuestions.length) {
            questions = selectRandomQuestions(
                allQuestions, 
                quiz.questionsPerAttempt, 
                `${req.user._id}-new`
            );
        }
        
        // Defensive check: ensure questions array is valid
        if (!questions || questions.length === 0) {
            return res.status(400).json({ errMsg: "Failed to select questions for this attempt" });
        }
        
        const responses = questions.map((q) => ({
            question: q._id,
            selectedChoiceIds: [],
            textAnswer: q.questionType === "written" ? "" : "",
            pointsAwarded: 0,
        }));
        const attempt = await Attempt.create({
            quiz: quiz._id,
            user: req.user._id,
            startAt: now.toDate(),
            endAt,
            status: "inProgress",
            responses,
        });
        
        
        
        // Log attempt started activity
        try {
            const course = await Course.findById(quiz.course).select("title").lean();
            await logActivity({
                userId: req.user._id,
                action: "attempt_started",
                details: `Started quiz: "${quiz.title}" in course "${course?.title || "Unknown"}"`,
                metadata: { 
                    quizId: quiz._id.toString(), 
                    quizTitle: quiz.title,
                    courseId: quiz.course.toString(),
                    courseName: course?.title || "Unknown",
                    attemptId: attempt._id.toString(),
                },
            });
        } catch (logErr) {
            console.error("Failed to log attempt started:", logErr);
        }
        
        // Verify the attempt was saved
        const savedAttempt = await Attempt.findById(attempt._id);
        
        return res.status(201).json({
            attemptId: attempt._id.toString(),
            endAt,
            questions: questions.map((q) => ({
                _id: q._id,
                prompt: q.prompt,
                questionType: q.questionType,
                points: q.points,
                choices: q.questionType === "written" ? [] : q.choices.map((c) => ({
                    _id: c._id,
                    text: c.text,
                })),
            })),
        });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to start attempt" });
    }
};

const autoSaveSchema = Joi.object({
    questionId: Joi.string().required(),
    selectedChoiceIds: Joi.array().items(Joi.string()).optional(),
    textAnswer: Joi.string().allow("").optional(),
}).or("selectedChoiceIds", "textAnswer");
const autoSaveAnswer = async (req: AuthRequest, res: Response) => {
    try {
        const { error, value } = autoSaveSchema.validate(req.body);
        if (error) {
            return res
                .status(400)
                .json({ errMsg: error.details[0]?.message || error.message });
        }
        const { attemptId } = req.params;
        const attempt = await Attempt.findById(attemptId);
        if (!attempt) {
            return res.status(404).json({ errMsg: "attempt not found" });
        }
        
        // Security: Verify ownership
        if (attempt.user.toString() !== req.user?._id) {
            return res.status(403).json({ error: "Forbidden" });
        }
        
        // Security: Only allow saving to in-progress attempts (or undefined for legacy attempts)
        const attemptStatus = attempt.status;
        if (attemptStatus && attemptStatus !== "inProgress") {
            return res.status(403).json({ error: "Attempt not in progress" });
        }
        
        const resp = attempt.responses.find(
            (r) => r.question.toString() === value.questionId,
        );
        if (!resp) return res.status(404).json({ error: "Response not found" });
        
        // Handle MCQ answers
        if (value.selectedChoiceIds && value.selectedChoiceIds.length > 0) {
            const objectIdSelection = value.selectedChoiceIds.map((id: string) => 
                Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id
            );
            resp.selectedChoiceIds = objectIdSelection as any;
        }
        
        // Handle written answers
        if (value.textAnswer !== undefined) {
            resp.textAnswer = value.textAnswer;
        }
        
        await attempt.save();
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ errMsg: "Autosave failed" });
    }
};

const submitAttempt = async (req: AuthRequest, res: Response) => {
    try {
        const { attemptId } = req.params;
        const attempt = await Attempt.findById(attemptId).populate({
            path: "responses.question",
            model: "Question",
        });
        if (!attempt)
            return res.status(404).json({ error: "Attempt not found" });
        if (attempt.user.toString() !== req.user?._id)
            return res.status(403).json({ error: "Forbidden" });
        const now = dayjs();
        const isLate = now.isAfter(dayjs(attempt.endAt));

        // Set status to submitted or late (align with scheduler state machine)
        attempt.status = isLate ? "late" : "submitted";
        attempt.submittedAt = now.toDate();
        await attempt.save();

        // Grade attempt immediately (teacher sees grades now, students see after quiz closes)
        // Must populate quiz to get gradingMode and closeAt
        await attempt.populate("quiz");
        const quiz = attempt.quiz as any;
        const gradingMode = quiz?.gradingMode || "onSubmit";
        const quizCloseAt = quiz?.closeAt;
        
        await gradeSubmittedAttempt(attempt, isLate);
        
        // Log quiz submission activity
        try {
            const quiz = attempt.quiz as any;
            const course = await Course.findById(quiz.course).select("title").lean();
            const score = attempt.score || 0;
            const maxScore = attempt.maxScore || 0;
            const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            
            await logActivity({
                userId: req.user?._id,
                action: isLate ? "quiz_submitted_late" : "quiz_submitted",
                details: `Submitted quiz: "${quiz.title}" in course "${course?.title || "Unknown"}" (Score: ${score}/${maxScore}, ${percentage}%)${isLate ? " [LATE]" : ""}`,
                metadata: { 
                    quizId: quiz._id.toString(), 
                    quizTitle: quiz.title,
                    courseId: quiz.course.toString(),
                    courseName: course?.title || "Unknown",
                    attemptId: attempt._id.toString(),
                    score,
                    maxScore,
                    percentage,
                    isLate,
                },
            });
        } catch (logErr) {
            console.error("Failed to log quiz submission:", logErr);
        }
        
        return res.json({ 
            attempt: attempt,
            gradingMode: gradingMode,
            quizCloseAt: quizCloseAt,
            quizEndAt: attempt.endAt,
            quizCloseAtDate: quizCloseAt, // Add the actual quiz close date
        });
    } catch (err) {
        return res.status(500).json({ error: "Submit failed" });
    }
};

// Helper function to grade an attempt (exported for quiz scheduler)
export const gradeSubmittedAttempt = async (attempt: any, wasLate = false) => {
    await attempt.populate({
        path: "responses.question",
        model: "Question",
    });
    let total = 0;
    let maxScore = 0;
    
    for (const resp of attempt.responses) {
        const q = resp.question as any;
        
        // Handle written questions with AI grading
        if (q.questionType === "written") {
            const maxPoints = q.points || 1;
            maxScore += maxPoints;
            
            // Only grade if there's a text answer
            if (resp.textAnswer && resp.textAnswer.trim()) {
                try {
                    const gradingResult = await gradeWrittenAnswer({
                        questionPrompt: q.prompt,
                        studentAnswer: resp.textAnswer,
                        sampleAnswer: q.sampleAnswer,
                        rubric: q.rubric,
                        maxPoints: maxPoints,
                    });
                    
                    resp.aiScore = gradingResult.score;
                    resp.aiFeedback = gradingResult.feedback;
                    resp.pointsAwarded = gradingResult.score;
                    total += gradingResult.score;
                } catch (error) {
                    console.error("AI grading failed for question:", q._id, error);
                    resp.pointsAwarded = 0;
                    resp.aiFeedback = "AI grading failed. Please contact your teacher.";
                    total += 0;
                }
            } else {
                // No answer provided
                resp.pointsAwarded = 0;
                resp.aiScore = 0;
                resp.aiFeedback = "No answer provided.";
                total += 0;
            }
            continue;
        }
        
        // Handle MCQ questions
        const choices = q.choices || [];
        
        // Find the correct choice
        const correctChoice = choices.find((c: any) => c.isCorrect);
        
        if (!correctChoice) {
            console.warn(`Question ${q._id} has no correct choice marked`);
            resp.pointsAwarded = 0;
            continue;
        }
        
        // Convert correct choice ID to string for comparison
        const correctChoiceId = correctChoice._id?.toString();
        const selectedIds = (resp.selectedChoiceIds || []).map((id: any) => 
            id instanceof Types.ObjectId ? id.toString() : String(id)
        );
        
        // Check if exactly one correct choice is selected (compare as strings)
        const isCorrect = 
            selectedIds.length === 1 && 
            selectedIds[0] === correctChoiceId;
        
        resp.pointsAwarded = isCorrect ? q.points || 1 : 0;
        
        total += resp.pointsAwarded;
        maxScore += q.points || 1;
    }
    attempt.score = total;
    attempt.maxScore = maxScore;
    attempt.status = "graded";
    await attempt.save();
};

const getResult = async (req: AuthRequest, res: Response) => {
    try {
        const { attemptId } = req.params;
        const attempt = await Attempt.findById(attemptId).populate({
            path: "responses.question",
            model: "Question",
        });
        if (!attempt)
            return res.status(404).json({ error: "Attempt not found" });
        if (attempt.user.toString() !== req.user?._id)
            return res.status(403).json({ error: "Forbidden" });
        return res.json({
            status: attempt.status,
            score: attempt.score,
            submittedAt: attempt.submittedAt,
        });
    } catch (err) {
        return res.status(500).json({ error: "Get result failed" });
    }
};

const listQuizGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { id: quizId } = req.params;
        const quiz = await Quiz.findById(quizId).populate("course");
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });
        if (quiz.course instanceof Types.ObjectId) {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (!quiz.course?.teacher)
            return res.status(403).json({ error: "Forbidden" });
        if (quiz.course.teacher.toString() !== req.user?._id)
            return res.status(403).json({ error: "Forbidden" });
        const attempts = await Attempt.find({
            quiz: quiz._id,
            status: { $in: ["graded", "late", "submitted"] },
        })
            .populate("user", "name email")
            .populate({ path: "responses.question", model: "Question" })
            .select("user score submittedAt status responses")
            .sort({ submittedAt: -1 })
            .lean();
        
        const results = attempts.map((a) => {
            // Calculate total possible points from this attempt's questions
            const totalPossiblePoints = a.responses?.reduce(
                (sum, r) => sum + (((r.question as any)?.points) || 1),
                0,
            ) || 0;
            const rawScore = a.responses?.reduce(
                (sum, r) => sum + ((r as any).pointsAwarded || 0),
                0,
            ) || 0;
            const scorePercentage =
                totalPossiblePoints > 0 && a.score !== undefined
                    ? Math.round((a.score / totalPossiblePoints) * 100)
                    : 0;

            return {
                attemptId: a._id,
                student: a.user,
                score: scorePercentage,
                rawScore: `(${rawScore}/${totalPossiblePoints})`,
                submittedAt: a.submittedAt,
                status: a.status,
            };
        });
        return res.json({
            quiz: {
                _id: quiz._id,
                title: (quiz as any)?.title || "Unknown Quiz",
            },
            results,
        });
    } catch (err) {
        return res.status(500).json({ error: "List grades failed" });
    }
};

// Export quiz grades as CSV
const exportQuizGradesCsv = async (req: AuthRequest, res: Response) => {
    try {
        const { id: quizId } = req.params;
        const quiz = await Quiz.findById(quizId).populate("course");
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });
        if (quiz.course instanceof Types.ObjectId) {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (!quiz.course?.teacher)
            return res.status(403).json({ error: "Forbidden" });
        if (quiz.course.teacher.toString() !== req.user?._id)
            return res.status(403).json({ error: "Forbidden" });
        
        const attempts = await Attempt.find({
            quiz: quiz._id,
            status: { $in: ["graded", "late", "submitted"] },
        })
            .populate("user", "name email")
            .populate({ path: "responses.question", model: "Question" })
            .select("user score submittedAt status responses")
            .sort({ submittedAt: -1 })
            .lean();
        
        // Calculate max possible points per question
        const questions = await Question.find({ quiz: quiz._id }).lean();
        const maxScorePerQuestion: Record<string, number> = {};
        for (const q of questions) {
            maxScorePerQuestion[q._id.toString()] = q.points || 1;
        }
        
        // Build CSV content
const headers = ["Student Name", "Email", "Score", "Submitted At", "Status"];
        const rows = [headers.join(",")];
        
        for (const a of attempts) {
            const student = a.user as any;
            const studentName = student?.name || "Unknown";
            const email = student?.email || "";
            
            // Calculate raw score
            const rawScore = a.responses?.reduce((sum, r) => {
                return sum + ((r as any).pointsAwarded || 0);
            }, 0) || 0;
            
            // Calculate max possible points for this attempt
            const maxPoints = a.responses?.reduce((sum, r) => {
                const qId = (r as any).question?._id?.toString() || (r as any).question?.toString();
                return sum + (maxScorePerQuestion[qId] || 1);
            }, 0) || 0;
            
            const scoreDisplay = `(${rawScore}/${maxPoints})`;
            const submittedAt = a.submittedAt ? new Date(a.submittedAt).toLocaleString("en-GB") : "";
            const status = a.status || "unknown";
            
            // Simple escape for CSV
            const escapeCsv = (field: string) => {
                if (field.includes(",") || field.includes('"')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };
            
            const row = [
                escapeCsv(studentName),
                escapeCsv(email),
                escapeCsv(scoreDisplay),
                escapeCsv(submittedAt),
                escapeCsv(status),
            ].join(",");
            
            rows.push(row);
        }
        
        const csv = rows.join("\n");
        const filename = `quiz-grades-${quiz.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
        
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
    } catch (err) {
        console.error("Export quiz grades error:", err);
        return res.status(500).json({ error: "Export failed" });
    }
};

const listMyGrades = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ errMsg: "forbidden" });
        const now = new Date();
        
        // Fetch graded attempts with quiz details including closeAt
        const attempts = await Attempt.find({
            user: req.user._id,
            status: { $in: ["graded", "late"] },
        })
            .populate({
                path: "quiz",
                select: "title course closeAt gradingMode",
                populate: { path: "course", select: "title" },
            })
            .populate({ path: "responses.question", model: "Question" })
            .select("quiz score submittedAt status responses")
            .sort({ submittedAt: -1 })
            .lean();
        
        const results = (attempts || []).map((a) => {
            const quiz = a.quiz as any;
            const quizCloseAt = quiz?.closeAt ? new Date(quiz.closeAt) : null;
            const gradingMode = quiz?.gradingMode || "onSubmit";
            // Show score immediately if gradingMode is "onSubmit", otherwise wait until quiz closes
            const isAvailable = gradingMode === "onSubmit" || !quizCloseAt || quizCloseAt <= now;
            
            // Calculate total possible points from this attempt's questions
            const totalPossiblePoints = a.responses?.reduce(
                (sum, r) => sum + (((r.question as any)?.points) || 1),
                0,
            ) || 0;
            const scorePercentage =
                totalPossiblePoints > 0 && a.score !== undefined
                    ? Math.round((a.score / totalPossiblePoints) * 100)
                    : 0;

            return {
                attemptId: a._id,
                quiz: {
                    _id: quiz?._id,
                    title: quiz?.title || "Unknown Quiz",
                },
                course: {
                    _id: quiz?.course?._id,
                    title: quiz?.course?.title || "Unknown Course",
                },
                score: isAvailable ? scorePercentage : null,
                submittedAt: a.submittedAt,
                status: a.status,
                gradingMode: quiz?.gradingMode || "onSubmit",
                closeAt: quiz?.closeAt,
                isAvailable,
            };
        });
        
        return res.json({ results });
    } catch (err) {
        console.error("listMyGrades error:", err);
        return res.status(500).json({ error: "List my grades failed" });
    }
};

const startAttemptFromBody = async (req: AuthRequest, res: Response) => {
    try {
        const { quizId } = req.body || {};
        if (!quizId) {
            return res.status(400).json({ error: "quizId is required" });
        }
        req.params.quizId = quizId;
        return startAttempt(req, res);
    } catch (err) {
        return res.status(500).json({ error: "Start attempt failed" });
    }
};

const getAttemptDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { attemptId } = req.params;
        
        // Validate attemptId
        if (!attemptId) {
            return res.status(400).json({ error: "Attempt ID is required" });
        }

        // Validate attemptId format (must be valid ObjectId)
        if (!attemptId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid attempt ID format" });
        }

        // First, let's just check if ANY attempts exist for this user
        const userAttempts = req.user?._id 
            ? await Attempt.find({ user: req.user._id }).select("_id status").limit(5).lean()
            : [];

        let attempt = await Attempt.findById(attemptId)
            .populate({ path: "responses.question", model: "Question" })
            .populate({
                path: "quiz",
                select: "title course",
                populate: { path: "course", select: "title" },
            });
        
        // Defensive check: attempt not found
        if (!attempt) {
            // Return more helpful error message
            return res.status(404).json({ 
                error: "Attempt not found",
                hint: "The quiz attempt may have expired or not started properly. Please start a new attempt."
            });
        }
        
        // Defensive check: user ownership
        if (!req.user?._id || attempt.user.toString() !== req.user._id) {
            return res.status(403).json({ error: "Forbidden - you can only view your own attempts" });
        }
        
        // Defensive check: responses exist
        if (!attempt.responses || attempt.responses.length === 0) {
            return res.status(400).json({ error: "No responses found for this attempt" });
        }
        
        const resp = attempt.responses.map((r) => {
            // Defensive check: question might not be populated
            const question = r.question as unknown as IQuestion;
            if (!question) {
                return {
                    questionId: null,
                    prompt: "Question not found",
                    questionType: "mcq_single",
                    points: 1,
                    selectedChoiceIds: [],
                    textAnswer: "",
                    pointsAwarded: 0,
                    selectedText: [],
                    correctText: [],
                    choices: [],
                };
            }
            
            const choices = question?.choices || [];
            
            const selectedText = (r.selectedChoiceIds || []).map(id => {
                const choice = choices.find(c => c._id?.toString() === id.toString() || (c as any).id === id.toString());
                return choice ? choice.text : "Unknown choice";
            });
            
            const correctText = choices.filter(c => c.isCorrect).map(c => c.text);
            
            // Include the full choices array for displaying answer options
            const choiceOptions = choices.map(c => ({
                _id: c._id?.toString(),
                text: c.text,
            }));
            
            return {
                questionId: (question as any)?._id,
                prompt: question?.prompt,
                questionType: question?.questionType,
                points: question?.points,
                selectedChoiceIds: r.selectedChoiceIds || [],
                textAnswer: r.textAnswer || "",
                pointsAwarded: r.pointsAwarded,
                aiScore: r.aiScore,
                aiFeedback: r.aiFeedback,
                selectedText,
                correctText,
                choices: choiceOptions,
            };
        });
        if (attempt.quiz instanceof Types.ObjectId) {
            return res.status(500).json({ errMsg: "server error" });
        }
        return res.json({
            attempt: {
                _id: attempt._id,
                status: attempt.status,
                score: attempt.score,
                startedAt: attempt.startAt,
                endAt: attempt.endAt,
                submittedAt: attempt.submittedAt,
            },
            quiz: {
                _id: attempt.quiz?._id,
                title: (attempt.quiz as any)?.title || "Unknown Quiz",
            },
            course: {
                _id: (attempt.quiz as any)?.course?._id,
                title: (attempt.quiz as any)?.course?.title || "Unknown Course",
            },
            responses: resp,
        });
    } catch (err) {
        return res.status(500).json({ error: "Get attempt details failed" });
    }
};

const getStudentCourseGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, courseId } = req.params;

        // Verify the requester is the course teacher
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found" });
        if (!req.user || req.user._id !== course.teacher.toString()) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const attempts = await Attempt.find({
            user: new Types.ObjectId(studentId),
            status: { $in: ["graded", "late"] },
        })
            .populate({
                path: "quiz",
                select: "title course",
                match: { course: courseId }, // Only quizzes from this course
                populate: { path: "course", select: "title" },
            })
            .populate({ path: "responses.question", model: "Question" })
            .select("quiz score submittedAt status responses")
            .sort({ submittedAt: -1 })
            .lean();

        // Filter out attempts where quiz population failed (not from this course)
        const courseAttempts = attempts.filter((a) => a.quiz);

        const results = courseAttempts.map((a) => {
            // Calculate total possible points from this attempt's questions
            const totalPossiblePoints = a.responses?.reduce(
                (sum, r) => sum + (((r.question as any)?.points) || 1),
                0,
            ) || 0;
            const scorePercentage =
                totalPossiblePoints > 0 && a.score !== undefined
                    ? Math.round((a.score / totalPossiblePoints) * 100)
                    : 0;

            return {
                attemptId: a._id,
                quiz: {
                    _id: a.quiz?._id,
                    title: (a.quiz as any)?.title || "Unknown Quiz",
                },
                score: scorePercentage,
                submittedAt: a.submittedAt,
                status: a.status,
            };
        });

        return res.json({ results });
    } catch (err) {
        console.error("getStudentCourseGrades error:", err);
        return res.status(500).json({ error: "Failed to get student course grades" });
    }
};

// Batch endpoint: Get grades for multiple students in a single query
const getBatchStudentGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, studentIds } = req.params;
        
        if (!studentIds) {
            return res.status(400).json({ error: "No student IDs provided" });
        }
        
        // Parse comma-separated student IDs
        const studentIdList = studentIds.split(",").map(id => id.trim()).filter(Boolean);
        
        if (!studentIdList.length) {
            return res.status(400).json({ error: "No student IDs provided" });
        }
        
        // Limit batch size to prevent abuse
        if (studentIdList.length > 50) {
            return res.status(400).json({ error: "Maximum 50 students per batch" });
        }

        // Verify the requester is the course teacher
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found" });
        if (!req.user || req.user._id !== course.teacher.toString()) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Fetch all attempts for all students in a single query
        const objectIds = studentIdList.map(id => new Types.ObjectId(id));
        const attempts = await Attempt.find({
            user: { $in: objectIds },
            status: { $in: ["graded", "late"] },
        })
            .populate({
                path: "quiz",
                select: "title course",
                match: { course: courseId },
                populate: { path: "course", select: "title" },
            })
            .populate({ path: "responses.question", model: "Question" })
            .select("user quiz score submittedAt status responses")
            .sort({ submittedAt: -1 })
            .lean();

        // Filter out attempts where quiz population failed (not from this course)
        const courseAttempts = attempts.filter((a) => a.quiz);

        // Group results by student ID
        const gradesByStudent: Record<string, any[]> = {};
        
        for (const studentId of studentIdList) {
            gradesByStudent[studentId] = [];
        }
        
        for (const a of courseAttempts) {
            const userId = a.user?.toString();
            if (!userId || !gradesByStudent[userId]) continue;
            
            const totalPossiblePoints = a.responses?.reduce(
                (sum, r) => sum + (((r.question as any)?.points) || 1),
                0,
            ) || 0;
            const scorePercentage =
                totalPossiblePoints > 0 && a.score !== undefined
                    ? Math.round((a.score / totalPossiblePoints) * 100)
                    : 0;

            gradesByStudent[userId].push({
                attemptId: a._id,
                quiz: {
                    _id: a.quiz?._id,
                    title: (a.quiz as any)?.title || "Unknown Quiz",
                },
                score: scorePercentage,
                submittedAt: a.submittedAt,
                status: a.status,
            });
        }

        return res.json({ results: gradesByStudent });
    } catch (err) {
        console.error("getBatchStudentGrades error:", err);
        return res.status(500).json({ error: "Failed to get batch student grades" });
    }
};

// Update response score (for teachers to override AI grades)
const updateResponseScore = async (req: AuthRequest, res: Response) => {
    try {
        const { attemptId, responseIndex } = req.params;
        const { score, feedback } = req.body;

        if (!responseIndex) {
            return res.status(400).json({ error: "Response index is required" });
        }

        if (score === undefined) {
            return res.status(400).json({ error: "Score is required" });
        }

        const attempt = await Attempt.findById(attemptId).populate({
            path: "quiz",
            populate: { path: "course" },
        });

        if (!attempt) {
            return res.status(404).json({ error: "Attempt not found" });
        }

        // Verify teacher owns the course
        const quiz = attempt.quiz as any;
        if (!quiz || !quiz.course) {
            return res.status(500).json({ error: "Failed to populate quiz" });
        }
        
        const course = quiz.course as any;
        const userId = req.user?._id;
        if (!userId || course.teacher.toString() !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const index = parseInt(responseIndex, 10);
        if (isNaN(index) || index < 0 || index >= attempt.responses.length) {
            return res.status(400).json({ error: "Invalid response index" });
        }

        const resp = attempt.responses[index];
        if (!resp) {
            return res.status(400).json({ error: "Response not found" });
        }
        
        // Update the score (this overrides AI score for written questions)
        resp.pointsAwarded = score;
        
        // Optionally update feedback
        if (feedback !== undefined) {
            resp.aiFeedback = feedback;
        }

        // Recalculate total score
        let total = 0;
        let maxScore = 0;
        
        await attempt.populate({
            path: "responses.question",
            model: "Question",
        });
        
        for (const r of attempt.responses) {
            const q = r.question as any;
            total += r.pointsAwarded || 0;
            maxScore += q.points || 1;
        }
        
        attempt.score = total;
        attempt.maxScore = maxScore;
        await attempt.save();

        return res.json({ 
            success: true, 
            score: resp.pointsAwarded,
            feedback: resp.aiFeedback,
            totalScore: total,
            maxScore: maxScore,
        });
    } catch (err) {
        console.error("updateResponseScore error:", err);
        return res.status(500).json({ error: "Failed to update score" });
    }
};

export {
    startAttempt,
    autoSaveAnswer,
    submitAttempt,
    getResult,
    listQuizGrades,
    exportQuizGradesCsv,
    listMyGrades,
    startAttemptFromBody,
    getStudentCourseGrades,
    getAttemptDetails,
    getBatchStudentGrades,
    updateResponseScore,
    getTeacherRecentSubmissions,
    debugMyAttempts,
};

/**
 * Get recent submissions for teacher's courses
 */
const getTeacherRecentSubmissions = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.status(401).json({ errMsg: "Unauthorized" });

        // Get all courses owned by this teacher
        const { default: Course } = await import("../models/course.js");
        const courses = await Course.find({ teacher: req.user._id }).select("_id").lean();
        const courseIds = courses.map(c => c._id);

        if (courseIds.length === 0) {
            return res.json({ submissions: [] });
        }

        // Get recent graded/late attempts from these courses
        const { default: Quiz } = await import("../models/quiz.js");

        const quizIds = await Quiz.find({ course: { $in: courseIds } }).select("_id").lean().then(qs => qs.map(q => q._id));

        // Get total count of all graded/late submissions
        const totalCount = await Attempt.countDocuments({
            quiz: { $in: quizIds },
            status: { $in: ["graded", "late"] }
        });

        const submissions = await Attempt.find({
            quiz: { $in: quizIds },
            status: { $in: ["graded", "late"] }
        })
            .populate({
                path: "user",
                select: "name"
            })
            .populate({
                path: "quiz",
                select: "title course",
                populate: { path: "course", select: "title" }
            })
            .select("score maxScore submittedAt")
            .sort({ submittedAt: -1 })
            .limit(10)
            .lean();

        const results = submissions.map(s => {
            const quiz = s.quiz as any;
            const user = s.user as any;
            const course = quiz?.course as any;
            const scoreValue = s.score ?? 0;
            const maxValue = s.maxScore ?? 1;
            const scorePercentage = maxValue > 0 ? Math.round((scoreValue / maxValue) * 100) : 0;

            return {
                id: s._id,
                studentName: user?.name || "Unknown",
                quizTitle: quiz?.title || "Unknown Quiz",
                courseTitle: course?.title || "Unknown Course",
                score: scorePercentage,
                submittedAt: s.submittedAt
            };
        });

        return res.json({ submissions: results, totalCount });
    } catch (error) {
        console.error("getTeacherRecentSubmissions error:", error);
        return res.status(500).json({ errMsg: "Failed to fetch recent submissions" });
    }
};

/**
 * Debug: List user's attempts
 */
const debugMyAttempts = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        if (!req.user) return res.status(401).json({ errMsg: "Unauthorized" });
        
        const attempts = await Attempt.find({ user: req.user._id })
            .select("quiz status createdAt endAt")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
            
        return res.json({ attempts });
    } catch (error) {
        console.error("debugMyAttempts error:", error);
        return res.status(500).json({ errMsg: "Failed to fetch attempts" });
    }
};
