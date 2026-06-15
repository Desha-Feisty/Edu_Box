// ============================================
// EduBox Shared Validation Schemas
// ============================================

import Joi from "joi";
import { ROLES, GRADING_MODES, TICKET_PRIORITY } from "./constants.js";

// ============================================
// Auth Validation
// ============================================
export const registerSchema = Joi.object({
    name: Joi.string()
        .min(6)
        .max(40)
        .required()
        .messages({
            "string.min": "Name must be at least 6 characters",
            "string.max": "Name must not exceed 40 characters",
            "any.required": "Name is required",
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({
            "string.email": "Please enter a valid email",
            "any.required": "Email is required",
        }),
    password: Joi.string()
        .min(6)
        .max(20)
        .required()
        .messages({
            "string.min": "Password must be at least 6 characters",
            "string.max": "Password must not exceed 20 characters",
            "any.required": "Password is required",
        }),
    role: Joi.string()
        .valid(...Object.values(ROLES))
        .required()
        .messages({
            "any.only": "Role must be student, teacher, or admin",
            "any.required": "Role is required",
        }),
});

export const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            "string.email": "Please enter a valid email",
            "any.required": "Email is required",
        }),
    password: Joi.string()
        .required()
        .messages({
            "any.required": "Password is required",
        }),
});

// ============================================
// Course Validation
// ============================================
export const createCourseSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            "string.min": "Title must be at least 3 characters",
            "string.max": "Title must not exceed 100 characters",
            "any.required": "Title is required",
        }),
    description: Joi.string()
        .max(500)
        .allow("")
        .messages({
            "string.max": "Description must not exceed 500 characters",
        }),
});

export const joinCourseSchema = Joi.object({
    joinCode: Joi.string()
        .length(6)
        .required()
        .messages({
            "string.length": "Join code must be 6 characters",
            "any.required": "Join code is required",
        }),
});

// ============================================
// Quiz Validation
// ============================================
export const createQuizSchema = Joi.object({
    course: Joi.string()
        .required()
        .messages({
            "any.required": "Course is required",
        }),
    title: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            "string.min": "Title must be at least 3 characters",
            "string.max": "Title must not exceed 100 characters",
            "any.required": "Title is required",
        }),
    description: Joi.string()
        .max(500)
        .allow("")
        .messages({
            "string.max": "Description must not exceed 500 characters",
        }),
    openAt: Joi.date()
        .iso()
        .required()
        .messages({
            "date.iso": "Open date must be a valid ISO date",
            "any.required": "Open date is required",
        }),
    closeAt: Joi.date()
        .iso()
        .greater(Joi.ref("openAt"))
        .required()
        .messages({
            "date.greater": "Close date must be after open date",
            "any.required": "Close date is required",
        }),
    durationMinutes: Joi.number()
        .min(10)
        .max(180)
        .required()
        .messages({
            "number.min": "Duration must be at least 10 minutes",
            "number.max": "Duration must not exceed 180 minutes",
            "any.required": "Duration is required",
        }),
    attemptsAllowed: Joi.number()
        .min(1)
        .max(10)
        .required()
        .messages({
            "number.min": "Attempts must be at least 1",
            "number.max": "Attempts must not exceed 10",
            "any.required": "Attempts allowed is required",
        }),
    questionsPerAttempt: Joi.number()
        .min(1)
        .max(100)
        .optional(),
    published: Joi.boolean().optional(),
    gradingMode: Joi.string()
        .valid(...Object.values(GRADING_MODES))
        .optional(),
    aiGrading: Joi.boolean().optional(),
});

export const submitQuizSchema = Joi.object({
    answers: Joi.array()
        .items(
            Joi.object({
                questionId: Joi.string().required(),
                selectedChoiceIds: Joi.array().items(Joi.string()).optional(),
                textAnswer: Joi.string().optional(),
            })
        )
        .min(1)
        .required()
        .messages({
            "array.min": "At least one answer is required",
            "any.required": "Answers are required",
        }),
});

// ============================================
// Question Validation
// ============================================
export const createQuestionSchema = Joi.object({
    quiz: Joi.string()
        .required()
        .messages({
            "any.required": "Quiz is required",
        }),
    questionType: Joi.string()
        .valid("mcq_single", "written")
        .required()
        .messages({
            "any.required": "Question type is required",
        }),
    prompt: Joi.string()
        .min(2)
        .max(5000)
        .required()
        .messages({
            "string.min": "Question prompt must be at least 2 characters",
            "string.max": "Question prompt must not exceed 5000 characters",
            "any.required": "Question prompt is required",
        }),
    choices: Joi.array()
        .items(Joi.object({
            text: Joi.string().min(1).max(500).required(),
            isCorrect: Joi.boolean().optional(),
        }))
        .optional(),
    sampleAnswer: Joi.string()
        .max(5000)
        .optional(),
    rubric: Joi.string()
        .max(5000)
        .optional(),
    points: Joi.number()
        .min(1)
        .max(100)
        .required()
        .messages({
            "number.min": "Points must be at least 1",
            "number.max": "Points must not exceed 100",
            "any.required": "Points are required",
        }),
});

// ============================================
// Note Validation
// ============================================
export const createNoteSchema = Joi.object({
    course: Joi.string()
        .required()
        .messages({
            "any.required": "Course is required",
        }),
    title: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            "string.min": "Title must be at least 3 characters",
            "string.max": "Title must not exceed 100 characters",
            "any.required": "Title is required",
        }),
    content: Joi.string()
        .min(10)
        .required()
        .messages({
            "string.min": "Content must be at least 10 characters",
            "any.required": "Content is required",
        }),
});

// ============================================
// Comment Validation
// ============================================
export const createCommentSchema = Joi.object({
    note: Joi.string()
        .required()
        .messages({
            "any.required": "Note is required",
        }),
    content: Joi.string()
        .min(1)
        .max(500)
        .required()
        .messages({
            "string.min": "Comment cannot be empty",
            "string.max": "Comment must not exceed 500 characters",
            "any.required": "Content is required",
        }),
});

// ============================================
// Chat Validation
// ============================================
export const sendMessageSchema = Joi.object({
    course: Joi.string()
        .required()
        .messages({
            "any.required": "Course is required",
        }),
    content: Joi.string()
        .min(1)
        .max(1000)
        .required()
        .messages({
            "string.min": "Message cannot be empty",
            "string.max": "Message must not exceed 1000 characters",
            "any.required": "Content is required",
        }),
});

// ============================================
// Ticket Validation
// ============================================
export const createTicketSchema = Joi.object({
    subject: Joi.string()
        .min(5)
        .max(100)
        .required()
        .messages({
            "string.min": "Subject must be at least 5 characters",
            "string.max": "Subject must not exceed 100 characters",
            "any.required": "Subject is required",
        }),
    description: Joi.string()
        .min(20)
        .required()
        .messages({
            "string.min": "Description must be at least 20 characters",
            "any.required": "Description is required",
        }),
    priority: Joi.string()
        .valid(...Object.values(TICKET_PRIORITY))
        .optional(),
});

// ============================================
// Calendar Event Validation
// ============================================
export const createEventSchema = Joi.object({
    course: Joi.string()
        .required()
        .messages({
            "any.required": "Course is required",
        }),
    title: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            "string.min": "Title must be at least 3 characters",
            "string.max": "Title must not exceed 100 characters",
            "any.required": "Title is required",
        }),
    description: Joi.string()
        .max(500)
        .allow("")
        .messages({
            "string.max": "Description must not exceed 500 characters",
        }),
    start: Joi.date()
        .iso()
        .required()
        .messages({
            "date.iso": "Start date must be a valid ISO date",
            "any.required": "Start date is required",
        }),
    end: Joi.date()
        .iso()
        .greater(Joi.ref("start"))
        .required()
        .messages({
            "date.greater": "End date must be after start date",
            "any.required": "End date is required",
        }),
});

// ============================================
// Refresh Token Validation
// ============================================
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .messages({
            "any.required": "Refresh token is required",
        }),
});

// ============================================
// Pagination Validation
// ============================================
export const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
});

// ============================================
// ID Parameter Validation
// ============================================
export const idParamSchema = Joi.object({
    id: Joi.string()
        .required()
        .messages({
            "any.required": "ID parameter is required",
        }),
});