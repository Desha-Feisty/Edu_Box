import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import * as attemptController from "../controllers/attempt.controller.js";
const router = Router();

// Rate limiter for autosave endpoint
const autosaveLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute per IP
    message: { error: "Too many autosave requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Literal routes MUST come before parameterized routes
// Otherwise "/start" gets captured as ":quizId"
router.post(
    "/start",
    authMiddleware,
    requireRole("student"),
    attemptController.startAttemptFromBody,
);
router.post(
    "/:quizId/attempts/start",
    authMiddleware,
    requireRole("student"),
    attemptController.startAttempt,
);
router.patch(
    "/:attemptId/answers",
    authMiddleware,
    requireRole("student"),
    autosaveLimiter,
    attemptController.autoSaveAnswer,
);
router.put(
    "/:attemptId/answer",
    authMiddleware,
    requireRole("student"),
    autosaveLimiter,
    attemptController.autoSaveAnswer,
);
// Stricter limiter for quiz submission
const submitLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Only 10 submissions per minute per IP
    message: { error: "Too many submission requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post(
    "/:attemptId/submit",
    authMiddleware,
    requireRole("student"),
    submitLimiter,
    attemptController.submitAttempt,
);
router.put(
    "/:attemptId/submit",
    authMiddleware,
    requireRole("student"),
    submitLimiter,
    attemptController.submitAttempt,
);
router.get(
    "/my",
    authMiddleware,
    requireRole("student"),
    attemptController.listMyGrades,
);
router.get(
    "/my-grades",
    authMiddleware,
    requireRole("student"),
    attemptController.listMyGrades,
);
router.get("/:attemptId/result", authMiddleware, attemptController.getResult);
router.get(
    "/:attemptId/grade",
    authMiddleware,
    requireRole("student"),
    attemptController.getResult,
);
router.get(
    "/:attemptId",
    authMiddleware,
    requireRole("student"),
    attemptController.getAttemptDetails,
);
router.get(
    "/student/:studentId/course/:courseId",
    authMiddleware,
    requireRole("teacher"),
    attemptController.getStudentCourseGrades,
);
router.get(
    "/batch/students/:studentIds/course/:courseId",
    authMiddleware,
    requireRole("teacher"),
    attemptController.getBatchStudentGrades,
);

export default router;
