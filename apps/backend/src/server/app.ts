import express, {
    type Request,
    type Response,
    type NextFunction,
} from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import swaggerUi from "swagger-ui-express";
import authRoutes from "../routes/auth.routes.js";
import courseRoutes from "../routes/course.routes.js";
import quizRoutes from "../routes/quiz.routes.js";
import attemptRoutes from "../routes/attempt.routes.js";
import noteRoutes from "../routes/note.routes.js";
import commentRoutes from "../routes/comment.routes.js";
import chatRoutes from "../routes/chat.routes.js";
import analyticsRoutes from "../routes/analytics.routes.js";
import adminRoutes from "../routes/admin.routes.js";
import leaderboardRoutes from "../routes/leaderboard.routes.js";
import notificationRoutes from "../routes/notification.routes.js";
import searchRoutes from "../routes/search.routes.js";
import ticketRoutes from "../routes/ticket.routes.js";
import calendarEventRoutes from "../routes/calendarEvent.routes.js";
import gradeRoutes from "../routes/grade.routes.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import * as quizController from "../controllers/quiz.controller.js";
import { specs } from "../utils/swagger.js";
import { RATE_LIMITS, TIMEOUTS } from "../utils/constants.js";

// Request timeout middleware to detect hanging requests
const requestTimeout = (timeoutMs: number = 30000) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const timeoutId = setTimeout(() => {
            console.error(`[TIMEOUT] Request to ${req.method} ${req.path} timed out after ${timeoutMs}ms`);
        }, timeoutMs);
        
        // Override res.send to clear timeout
        const originalSend = res.send.bind(res);
        res.send = (body?: any) => {
            clearTimeout(timeoutId);
            return originalSend(body);
        };
        
        // Override res.json to clear timeout
        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            clearTimeout(timeoutId);
            return originalJson(body);
        };
        
        next();
    };
};
import { requestLogger } from "../middleware/requestLogger.js";
import { errorHandler } from "../middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Security: Helmet headers
app.use(helmet());

const isTest = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";

// Security: Rate limiting - increased for normal use
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isTest ? 10000 : RATE_LIMITS.DEFAULT,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limit for autosave (frequent endpoint)
const autosaveLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isTest ? 1000 : RATE_LIMITS.AUTOSAVE,
    message: { error: "Too many autosave requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// More lenient limiter for read operations (GET requests)
const readLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isTest ? 10000 : RATE_LIMITS.READ,
    message: { error: "Too many read requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// CORS configuration - environment-based
const allowedOrigins = isProduction
    ? [
        ...(process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim()) || []),
    ]
    : [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, mobile apps)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        if (isProduction) {
            return callback(new Error("Not allowed by CORS"));
        }
        // In development, allow any origin
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Global body size limit — 1MB handles 99% of requests
// Routes that need larger payloads (e.g., AI generation, notes) apply their own limit
app.use(express.json({ limit: '1mb' }));

// Larger body limit for specific payload-heavy routes
app.use("/api/quizzes/:quizId/questions/generate-ai", express.json({ limit: '5mb' }));
app.use("/api/notes", express.json({ limit: '5mb' }));
app.use(morgan("dev"));
app.use(requestLogger);

// Serve simple UI for testing endpoints (only in dev/test)
if (!isProduction) {
    app.use(express.static(path.join(__dirname, "..", "public")));
}
app.use("/docs", express.static(path.join(__dirname, "..", "docs")));

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "LMS API Documentation",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
    },
}));

app.use(requestTimeout(TIMEOUTS.REQUEST));
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/courses", calendarEventRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/chats", chatRoutes);
// Backward-compatible mount: older clients may use /api/chat
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", authMiddleware, searchRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/admin", adminRoutes);

// Question management root-level endpoints
app.post(
    "/api/questions",
    authMiddleware,
    requireRole("teacher"),
    quizController.addQuestionViaBody,
);
app.put(
    "/api/questions/:id",
    authMiddleware,
    requireRole("teacher"),
    quizController.updateQuestion,
);
app.delete(
    "/api/questions/:id",
    authMiddleware,
    requireRole("teacher"),
    quizController.deleteQuestion,
);
app.post(
    "/api/questions/:id/regenerate-rubric",
    authMiddleware,
    requireRole("teacher"),
    quizController.regenerateRubric,
);

// Health check endpoint (no auth required)
app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Centralized error handler - handles Mongoose, JWT, and operational errors
app.use(errorHandler);

export default app;
