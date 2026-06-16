import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import * as quizController from "../controllers/quiz.controller.js";
import * as attemptController from "../controllers/attempt.controller.js";
const router = Router();

// More lenient limiter for read operations
const readLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute for reads
    message: { error: "Too many read requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limiter for write operations (quiz submission, answers)
const writeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 write requests per minute
    message: { error: "Too many write requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post(
    "/:id/quizzes",
    authMiddleware,
    requireRole("teacher"),
    quizController.createQuizFromBody,
);
router.post(
    "/",
    authMiddleware,
    requireRole("teacher"),
    quizController.createQuizFromBody,
);
router.get("/course/:id", authMiddleware, readLimiter, quizController.listCourseQuizzes);
router.get("/available", authMiddleware, readLimiter, quizController.listAvailableQuizzes);
router.get("/:id", authMiddleware, readLimiter, quizController.getQuizDetails);
router.put(
    "/:id",
    authMiddleware,
    requireRole("teacher"),
    quizController.updateQuiz,
);
router.delete(
    "/:id",
    authMiddleware,
    requireRole("teacher"),
    quizController.deleteQuiz,
);
router.post(
    "/:id/questions",
    authMiddleware,
    requireRole("teacher"),
    quizController.addQuestion,
);
router.post(
    "/:id/publish",
    authMiddleware,
    requireRole("teacher"),
    quizController.publishQuiz,
);
router.post(
    "/:id/questions/generate-ai",
    authMiddleware,
    requireRole("teacher"),
    quizController.generateQuestionsWithAI,
);
router.post(
    "/:id/questions/generate-from-file",
    authMiddleware,
    requireRole("teacher"),
    writeLimiter,
    upload.single("file"),
    quizController.generateQuestionsFromFile,
);
router.get(
    "/:id/grades",
    authMiddleware,
    requireRole("teacher"),
    attemptController.listQuizGrades,
);
router.get(
    "/:id/grades/export",
    authMiddleware,
    requireRole("teacher"),
    attemptController.exportQuizGradesCsv,
);

export default router;
