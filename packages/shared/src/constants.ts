// ============================================
// EduBox Shared Constants
// ============================================
// Merged from frontend/src/lib/constants.js and backend/src/utils/constants.ts

// ============================================
// User Roles
// ============================================
export const ROLES = {
    STUDENT: "student",
    TEACHER: "teacher",
    ADMIN: "admin",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// ============================================
// Quiz Status
// ============================================
export const QUIZ_STATUS = {
    IN_PROGRESS: "inProgress",
    GRADED: "graded",
    EXPIRED: "expired",
    LATE: "late",
    SUBMITTED: "submitted",
} as const;

export type QuizStatus = (typeof QUIZ_STATUS)[keyof typeof QUIZ_STATUS];

// ============================================
// Question Types
// ============================================
export type QuestionType = "mcq_single" | "written";

// ============================================
// Attempt Status
// ============================================
export type AttemptStatus = "inProgress" | "graded" | "expired" | "late" | "submitted";

// ============================================
// Notification Types
// ============================================
export const NOTIFICATION_TYPES = {
    QUIZ: "quiz",
    QUIZ_GRADED: "quiz-graded",
    QUIZ_MISSED: "quiz-missed",
    NOTE: "note",
    CHAT: "chat",
    SYSTEM: "system",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// ============================================
// Grading Modes
// ============================================
export const GRADING_MODES = {
    ON_SUBMIT: "onSubmit",
    ON_CLOSE: "onClose",
} as const;

export type GradingMode = (typeof GRADING_MODES)[keyof typeof GRADING_MODES];

// ============================================
// Pagination
// ============================================
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    BACKEND_DEFAULT_LIMIT: 20,
} as const;

// ============================================
// Timeouts (milliseconds)
// ============================================
export const TIMEOUTS = {
    API: 30000,
    DEBOUNCE: 500,
    TOAST_DURATION: 4000,
    AUTH_WAIT: 5000,
    REQUEST: 30000,
} as const;

// ============================================
// Storage Keys
// ============================================
export const STORAGE_KEYS = {
    AUTH: "auth-storage",
    TOKEN: "token",
    REFRESH_TOKEN: "refreshToken",
    THEME: "theme",
} as const;

// ============================================
// Routes
// ============================================
export const ROUTES = {
    LOGIN: "/login",
    STUDENT: "/student",
    TEACHER: "/teacher",
    ADMIN: "/admin",
    STUDENT_QUIZ: (attemptId: string) => `/student/quiz/${attemptId}`,
    TEACHER_COURSE: (id: string) => `/teacher/course/${id}`,
    TEACHER_QUIZ: (id: string) => `/teacher/quiz/${id}/questions`,
    NOTE: (noteId: string) => `/note/${noteId}`,
} as const;

// ============================================
// Quiz Time Limits (minutes)
// ============================================
export const QUIZ_LIMITS = {
    MIN_DURATION: 10,
    MAX_DURATION: 180,
    DEFAULT_DURATION: 30,
} as const;

// ============================================
// Validation
// ============================================
export const VALIDATION = {
    NAME_MIN: 6,
    NAME_MAX: 40,
    PASSWORD_MIN: 6,
    PASSWORD_MAX: 20,
    EMAIL_REGEX: /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/,
} as const;

// Backend-specific password validation
export const PASSWORD_VALIDATION = {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
} as const;

// ============================================
// UI Breakpoints
// ============================================
export const BREAKPOINTS = {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
} as const;

// ============================================
// Rate Limits (requests per window)
// ============================================
export const RATE_LIMITS = {
    DEFAULT: 1000,
    AUTOSAVE: 60,
    READ: 500,
} as const;

// ============================================
// Quiz Scheduler
// ============================================
export const SCHEDULER = {
    CRON_INTERVAL: "* * * * *",
    NOTIFICATION_TTL_HOURS: 24,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 100,
} as const;

// ============================================
// Token Refresh
// ============================================
export const AUTH_WAIT = {
    MAX_WAIT_MS: 5000,
    RETRY_DELAY_MS: 100,
    MAX_RETRIES: 3,
} as const;

// ============================================
// Autosave
// ============================================
export const AUTOSAVE_DELAY = 500 as const;

// ============================================
// API Endpoints
// ============================================
export const API_ENDPOINTS = {
    AUTH: "/api/auth",
    COURSES: "/api/courses",
    QUIZZES: "/api/quizzes",
    ATTEMPTS: "/api/attempts",
    ADMIN: "/api/admin",
} as const;

// ============================================
// Ticket Status & Priority
// ============================================
export const TICKET_STATUS = {
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    RESOLVED: "resolved",
    CLOSED: "closed",
} as const;

export const TICKET_PRIORITY = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];
export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];