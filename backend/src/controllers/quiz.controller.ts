import Joi from "joi";
import type { AuthRequest } from "../types/authRequest.js";
import type { Response } from "express";
import Course from "../models/course.js";
import Quiz from "../models/quiz.js";
import Question from "../models/question.js";
import Attempt from "../models/attempt.js";
import { startSession, Types } from "mongoose";
import Enrollment from "../models/enrollment.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logActivity } from "../services/logger.js";

const createQuizSchema = Joi.object({
    title: Joi.string().min(2).required(),
    description: Joi.string().allow("").optional(),
    openAt: Joi.alternatives()
        .try(Joi.date().iso(), Joi.string().isoDate())
        .required(),
    closeAt: Joi.alternatives()
        .try(Joi.date().iso(), Joi.string().isoDate())
        .required(),
    attemptsAllowed: Joi.number().min(1).default(1),
    durationMinutes: Joi.number().min(10).required(),
    questionsPerAttempt: Joi.number().integer().min(1).allow("").optional(),
    gradingMode: Joi.string().valid("onSubmit", "onClose").default("onSubmit"),
})
    .unknown(true)
    .custom((value, helpers) => {
        try {
            // Convert empty string to undefined for optional fields
            if (value.questionsPerAttempt === "") {
                value.questionsPerAttempt = undefined;
            }
            if (value.attemptsAllowed === "") {
                value.attemptsAllowed = undefined;
            }
            
            const openDate = new Date(value.openAt);
            const closeDate = new Date(value.closeAt);
            if (openDate >= closeDate) {
                throw new Error("openAt must be before closeAt");
            }

            // Duration cannot exceed the time window between openAt and closeAt
            const timeWindowMinutes = (closeDate.getTime() - openDate.getTime()) / (1000 * 60);
            if (value.durationMinutes > timeWindowMinutes) {
                throw new Error(`durationMinutes cannot exceed the time window between openAt and closeAt (${Math.floor(timeWindowMinutes)} minutes)`);
            }

            return value;
        } catch (err: any) {
            throw new Error(err.message || "Invalid date format");
        }
    });

const createQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const courseId = req.params.id || req.params.courseId;

        if (!courseId) {
            return res.status(400).json({
                errMsg: "invalid course id - parameter 'id' is missing",
            });
        }

        if (!req.user || req.user.role !== "teacher") {
            return res.status(403).json({
                errMsg: "forbidden - only teachers can create quizzes",
            });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ errMsg: "course not found" });
        }

        const teacherId =
            course.teacher instanceof Types.ObjectId
                ? course.teacher.toString()
                : (course.teacher as any)._id?.toString() ||
                  course.teacher.toString();

        if (teacherId !== req.user._id) {
            console.error(
                `Unauthorized quiz creation attempt: course teacher ${teacherId} vs user ${req.user._id}`,
            );
            return res
                .status(403)
                .json({ errMsg: "forbidden - you do not own this course" });
        }

        const { error, value } = createQuizSchema.validate(req.body);
        if (error) {
            console.error("Validation error:", error.message);
            return res.status(400).json({ errMsg: error.message });
        }

        const quiz = new Quiz({
            course: course._id,
            ...value,
            published: false,
        });
        await quiz.save();

        await logActivity({
            userId: req.user?._id,
            action: "quiz_created",
            details: `Quiz created: "${quiz.title}" for course "${course.title}"`,
        });

        
        return res.status(201).json({ quiz });
    } catch (error) {
        console.error("Quiz creation error:", error);
        return res.status(500).json({
            errMsg: "Internal server error while creating quiz",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

const addQuestionSchema = Joi.object({
    prompt: Joi.string().min(3).required(),
    points: Joi.number().integer().default(1).min(0),
    orderIndex: Joi.number().integer().min(0).default(0),
    choices: Joi.array()
        .items(
            Joi.object({
                text: Joi.string().required(),
                isCorrect: Joi.boolean().default(false),
            }),
        )
        .min(2)
        .required(),
});

const addQuestion = async (req: AuthRequest, res: Response) => {
    try {
        const { id: quizId } = req.params;
        if (!quizId) {
            return res
                .status(400)
                .json({ errMsg: "please provide valid quiz id" });
        }
        const quiz = await Quiz.findById(quizId).populate({
            path: "course",
            populate: { path: "teacher", select: "_id" },
        });
        if (!quiz) {
            return res.status(404).json({ errMsg: "quiz not found" });
        }
        if (quiz.course instanceof Types.ObjectId) {
            return res.status(500).json({ errMsg: "course was not populated" });
        }
        const teacherId =
            quiz.course.teacher instanceof Types.ObjectId
                ? quiz.course.teacher.toString()
                : quiz.course.teacher._id.toString();
        if (teacherId !== req.user?._id) {
            return res.status(403).json({ errMsg: "forbidden" });
        }
        const { error, value } = addQuestionSchema.validate(req.body);
        if (error)
            return res
                .status(400)
                .json({ error: error.details[0]?.message || error.message });
        const question = await Question.create({
            quiz: quiz._id,
            questionType: "mcq_single",
            ...value,
        });
        return res.status(201).json({ question });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to create question" });
    }
};

const addQuestionBodySchema = Joi.object({
    quizId: Joi.string().required(),
    prompt: Joi.string().min(2).required(),
    points: Joi.number().integer().min(0).default(1),
    orderIndex: Joi.number().integer().min(0).default(0),
    choices: Joi.array()
        .items(
            Joi.object({
                text: Joi.string().required(),
                isCorrect: Joi.boolean().default(false),
            }),
        )
        .min(2)
        .required(),
});

const addQuestionViaBody = async (req: AuthRequest, res: Response) => {
    try {
        const { error, value } = addQuestionBodySchema.validate(req.body);
        if (error) {
            return res
                .status(400)
                .json({ errMsg: error.details[0]?.message || error.message });
        }
        const quiz = await Quiz.findById(value.quizId).populate("course");
        if (!quiz) return res.status(404).json({ errMsg: "quiz not found" });
        if (quiz.course instanceof Types.ObjectId) {
            return res
                .status(500)
                .json({ errMsg: "failed to populate course" });
        }
        if (quiz.course.teacher.toString() !== req.user?._id)
            return res.status(403).json({ error: "Forbidden" });
        const q = await Question.create({
            quiz: quiz._id,
            questionType: "mcq_single",
            prompt: value.prompt,
            points: value.points,
            orderIndex: value.orderIndex,
            choices: value.choices,
        });
        return res.status(201).json({ question: q });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to create quiz" });
    }
};

const updateQuestionSchema = Joi.object({
    prompt: Joi.string().min(2).optional(),
    points: Joi.number().integer().min(0).optional(),
    orderIndex: Joi.number().integer().min(0).optional(),
    choices: Joi.array()
        .items(
            Joi.object({
                text: Joi.string().required(),
                isCorrect: Joi.boolean().default(false),
            }),
        )
        .min(2)
        .optional(),
}).min(1);

const updateQuestion = async (req: AuthRequest, res: Response) => {
    try {
        const { id: questionId } = req.params;
        if (!questionId) {
            return res.status(400).json({ errMsg: "question id invalid" });
        }
        const { error, value } = updateQuestionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                errMsg: error.details[0]?.message || error.message,
            });
        }
        const question = await Question.findById(questionId).populate({
            path: "quiz",
            populate: { path: "course" },
        });
        if (!question) {
            return res.status(404).json({ errMsg: "question not found" });
        }
        if (question.quiz instanceof Types.ObjectId) {
            return res
                .status(500)
                .json({ errMsg: "failed to populate course" });
        }
        if (question.quiz.course instanceof Types.ObjectId) {
            return res
                .status(500)
                .json({ errMsg: "failed to populate course" });
        }
        if (question.quiz.course.teacher.toString() !== req.user?._id) {
            return res.status(403).json({ errMsg: "forbidden" });
        }
        if (value.prompt !== undefined) question.prompt = value.prompt;
        if (value.points !== undefined) question.points = value.points;
        if (value.orderIndex !== undefined)
            question.orderIndex = value.orderIndex;
        if (value.choices !== undefined) question.choices = value.choices;
        await question.save();
        return res.status(200).json({ question });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to update question" });
    }
};

const deleteQuestion = async (req: AuthRequest, res: Response) => {
    try {
        const { id: questionId } = req.params;
        if (!questionId) {
            return res.status(400).json({ errMsg: "invalid question id" });
        }
        const question = await Question.findById(questionId).populate({
            path: "quiz",
            populate: { path: "course" },
        });
        if (!question) {
            return res.status(404).json({ errMsg: "question not found" });
        }
        if (
            question.quiz instanceof Types.ObjectId ||
            question.quiz.course instanceof Types.ObjectId
        ) {
            return res.status(500).json({ errMsg: "failed to populate" });
        }
        if (question.quiz.course.teacher.toString() !== req.user?._id) {
            return res.status(403).json({ errMsg: "forbidden" });
        }
        await Question.findByIdAndDelete(questionId);
        return res.status(200).json({
            msg: "question deleted successfully",
            question,
        });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to delete question" });
    }
};

const publishQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const { id: quizId } = req.params;
        if (!quizId) {
            return res.status(400).json({ errMsg: "invalid quiz id" });
        }
        const quiz = await Quiz.findById(quizId).populate({
            path: "course",
            populate: { path: "teacher", select: "_id" },
        });
        if (!quiz) {
            return res.status(404).json({ errMsg: "quiz not found" });
        }
        if (quiz.course instanceof Types.ObjectId) {
            return res.status(500).json({ errMsg: "course not populated" });
        }
        const teacher =
            quiz.course.teacher instanceof Types.ObjectId
                ? quiz.course.teacher.toString()
                : quiz.course.teacher._id.toString();
        if (teacher !== req.user?._id) {
            return res.status(403).json({ errMsg: "forbidden" });
        }

        const questionCount = await Question.countDocuments({ quiz: quiz._id });
        if (questionCount === 0) {
            return res.status(400).json({
                errMsg: "Quiz must contain at least one question before publishing.",
            });
        }

        quiz.published = true;
        await quiz.save();

        await logActivity({
            userId: req.user?._id,
            action: "quiz_published",
            details: `Quiz published: "${quiz.title}"`,
        });

        // Real-time Notification
        try {
            const courseId = (quiz.course as any)._id || quiz.course;
            const enrollments = await Enrollment.find({
                course: courseId,
                status: "active",
            }).select("user");

            const studentIds = enrollments.map((e) => e.user.toString());
            if (studentIds.length > 0) {
                const { notifyUsers } = await import("../server/socket.js");
                notifyUsers(studentIds, "new-quiz", {
                    quizId: quiz._id,
                    title: quiz.title,
                    courseTitle: (quiz.course as any).title,
                });
            }
        } catch (error) {
            console.error(
                "Failed to send socket notification for new quiz:",
                error,
            );
        }

        return res.status(200).json({ quiz });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "could not publish quiz" });
    }
};

const listCourseQuizzes = async (req: AuthRequest, res: Response) => {
    try {
        const courseId = req.params.id || req.params.courseId;
        if (!courseId)
            return res.status(400).json({
                errMsg: "invalid course id - parameter 'id' is missing",
            });
        const course = await Course.findById(courseId).select("teacher title");
        if (!course)
            return res.status(404).json({ errMsg: "course not found" });
        if (!req.user?._id)
            return res.status(401).json({ errMsg: "unauthenticated" });
        const isTeacher = course.teacher.toString() === req.user?._id;
        const isStudent = await Enrollment.findOne({
            user: req.user._id,
            course: courseId,
        });
        if (!isTeacher && !isStudent) {
            return res.status(403).json({ errMsg: "unauthorized" });
        }
        const fields = [
            "title",
            "description",
            "openAt",
            "closeAt",
            "durationMinutes",
            "attemptsAllowed",
            "questionsPerAttempt",
        ];

        if (isTeacher) fields.push("published", "createdAt");

        const quizzes = await Quiz.find({ course: courseId })
            .select(fields.join(" "))
            .sort("-createdAt");

        const filteredQuizzes = isTeacher
            ? quizzes
            : quizzes.filter((q) => q.published);

        return res.json({ course, filteredQuizzes });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "error fetching available quizzes" });
    }
};

const getQuizDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id: quizId } = req.params;
        if (!quizId) return res.status(400).json({ errMsg: "invalid quiz id" });
        const quiz = await Quiz.findById(quizId).populate("course");
        if (!quiz) return res.status(404).json({ errMsg: "quiz not found" });
        if (quiz.course instanceof Types.ObjectId) {
            return res
                .status(500)
                .json({ errMsg: "failed to populate course" });
        }
        if (!quiz.course || !quiz.course.teacher) {
            return res
                .status(500)
                .json({ errMsg: "failed to populate course" });
        }
        if (!req.user) return res.status(401).json({ errMsg: "forbidden" });
        const isTeacher = quiz.course.teacher.toString() === req.user?._id;
        const isStudent = await Enrollment.exists({
            course: quiz.course,
            user: req.user._id,
            status: "active",
        });
        if (!isTeacher && !isStudent)
            return res.status(403).json({ errMsg: "forbidden" });
        
        // Check timing for students - don't reveal content before quiz opens
        const now = new Date();
        const isNotYetOpen = quiz.openAt && now < new Date(quiz.openAt);
        const isClosed = quiz.closeAt && now > new Date(quiz.closeAt);
        
        if (isStudent && !isTeacher && isNotYetOpen) {
            return res.status(200).json({ 
                quiz: {
                    _id: quiz._id,
                    title: quiz.title,
                    description: quiz.description,
                    openAt: quiz.openAt,
                    closeAt: quiz.closeAt,
                    durationMinutes: quiz.durationMinutes,
                    attemptsAllowed: quiz.attemptsAllowed,
                    questionsPerAttempt: quiz.questionsPerAttempt,
                    published: quiz.published,
                    gradingMode: quiz.gradingMode,
                }, 
                questions: [],
                questionCount: null,
                timingStatus: "upcoming"
            });
        }
        
        const questionCount = await Question.countDocuments({ quiz: quizId });
        
        const questions = isTeacher 
            ? await Question.find({ quiz: quizId }).sort("orderIndex")
            : await Question.find({ quiz: quizId }).sort("orderIndex").select("-choices.isCorrect");
            
        return res.status(200).json({ 
            quiz, 
            questions,
            questionCount,
            timingStatus: isNotYetOpen ? "upcoming" : isClosed ? "closed" : "open"
        });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to fetch quizz" });
    }
};

const updateQuizSchema = Joi.object({
    title: Joi.string().min(2).optional(),
    description: Joi.string().allow("").optional(),
    openAt: Joi.date().optional(),
    closeAt: Joi.date().optional(),
    attemptsAllowed: Joi.number().min(1).optional(),
    durationMinutes: Joi.number().min(10).optional(),
    questionsPerAttempt: Joi.number().integer().min(1).optional(),
    published: Joi.boolean().optional(),
    gradingMode: Joi.string().valid("onSubmit", "onClose").optional(),
}).custom((value, helpers) => {
    if (
        value.openAt &&
        value.closeAt &&
        new Date(value.openAt) >= new Date(value.closeAt)
    ) {
        throw new Error("openAt must be before closeAt");
    }

    // Duration cannot exceed the time window between openAt and closeAt
    if (value.openAt && value.closeAt && value.durationMinutes) {
        const openDate = new Date(value.openAt);
        const closeDate = new Date(value.closeAt);
        const timeWindowMinutes = (closeDate.getTime() - openDate.getTime()) / (1000 * 60);
        if (value.durationMinutes > timeWindowMinutes) {
            throw new Error(`durationMinutes cannot exceed the time window between openAt and closeAt (${Math.floor(timeWindowMinutes)} minutes)`);
        }
    }

    return value;
});

const listAvailableQuizzes = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }
        // Only get active enrollments
        const enrollments = await Enrollment.find({ user: req.user._id, status: "active" });
        const courseIds = enrollments.map((e) => e.course);
        if (courseIds.length === 0) {
            return res.status(200).json({ quizzes: [] });
        }
        const now = new Date();
        const quizzes = await Quiz.find({
            course: { $in: courseIds },
            published: true,
            closeAt: { $gt: now }, // Only show quizzes that haven't closed yet
        })
            .populate("course")
            .select("-published")
            .sort({ _id: -1 });

        // Fetch user attempts to check which quizzes have been answered
        const userAttempts = await Attempt.find({
            user: req.user._id,
            quiz: { $in: quizzes.map((q) => q._id) },
        }).select("quiz");

        const attemptedQuizIds = new Set(
            userAttempts.map((a) => a.quiz.toString()),
        );

        // Add isAttempted flag and status to each quiz
        const quizzesWithStatus = quizzes.map((quiz) => {
            const openAt = new Date(quiz.openAt);
            const closeAt = new Date(quiz.closeAt);
            let status = "open";

            if (now < openAt) {
                status = "upcoming";
            } else if (now > closeAt) {
                status = "closed";
            }

            return {
                ...quiz.toObject(),
                isAttempted: attemptedQuizIds.has(quiz._id.toString()),
                timingStatus: status, // upcoming, open, closed
            };
        });

        return res.status(200).json({ quizzes: quizzesWithStatus });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to fetch quizzes" });
    }
};

const updateQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const { id: quizId } = req.params;
        if (!quizId) return res.status(400).json({ errMsg: "invalid quiz id" });
        const { error, value } = updateQuizSchema.validate(req.body);
        if (error)
            return res.status(400).json({ errMsg: error.message || error });
        const quiz = await Quiz.findById(quizId).populate("course");
        if (!quiz) return res.status(404).json({ errMsg: "quiz not found" });
        if (!req.user || !req.user._id) {
            return res.status(403).json({ errMsg: "forbidden" });
        }
        if (quiz.course instanceof Types.ObjectId) {
            return res
                .status(500)
                .json({ errMsg: "failed to populate course" });
        }
        if (quiz.course.teacher.toString() !== req.user._id) {
            return res.status(403).json({ errMsg: "forbidden" });
        }
        if (value.title !== undefined) quiz.title = value.title;
        if (value.description !== undefined)
            quiz.description = value.description;
        if (value.openAt !== undefined) quiz.openAt = value.openAt;
        if (value.closeAt !== undefined) quiz.closeAt = value.closeAt;
        if (value.durationMinutes !== undefined) {
            quiz.durationMinutes = value.durationMinutes;
        }
        if (value.attemptsAllowed !== undefined) {
            quiz.attemptsAllowed = value.attemptsAllowed;
        }
        if (value.published !== undefined) {
            quiz.published = value.published;
        }
        if (value.gradingMode !== undefined) {
            quiz.gradingMode = value.gradingMode;
        }
        await quiz.save();
        return res.status(200).json({ quiz });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to update quiz" });
    }
};

const deleteQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const { id: quizId } = req.params;
        if (!quizId) return res.status(400).json({ errMsg: "invalid quiz id" });
        if (!req.user || !req.user._id) {
            return res.status(403).json({ errMsg: "forbidden - missing auth" });
        }

        const quiz = await Quiz.findById(quizId).populate("course");
        if (!quiz) {
            return res.status(404).json({ errMsg: "quiz not found" });
        }

        if (!quiz.course || quiz.course instanceof Types.ObjectId) {
            return res
                .status(500)
                .json({ errMsg: "failed to populate course info" });
        }

        const teacherId = (quiz.course as any).teacher?.toString();
        if (teacherId !== req.user._id) {
            return res
                .status(403)
                .json({ errMsg: "forbidden - you do not own this course" });
        }

        // Delete all associated questions first
        await Question.deleteMany({ quiz: quiz._id });

        // Delete the quiz itself
        const deletedQuiz = await Quiz.findByIdAndDelete(quizId);

        return res.status(200).json({ msg: "quiz deleted successfully", deletedQuiz });
    } catch (error) {
        console.error("Delete quiz error:", error);
        return res.status(500).json({
            errMsg: "failed to delete quiz",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

const createQuizFromBody = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, ...payload } = req.body || {};
        if (!courseId)
            return res.status(400).json({ errMsg: "invalid course id" });
        const { error, value } = createQuizSchema.validate(payload);
        if (error) {
            return res
                .status(400)
                .json({ errMsg: error.details[0]?.message || error.message });
        }
        const course = await Course.findById(courseId);
        if (!course)
            return res.status(404).json({ errMsg: "course not found" });
        if (course.teacher.toString() !== req.user?._id) {
            return res.status(403).json({ errMsg: "forbidden" });
        }
        const quiz = await Quiz.create({
            course: course._id,
            ...value,
            published: false,
        });
        return res.status(201).json({ quiz });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return res.status(500).json({ errMsg: "failed to create quiz" });
    }
};

const generateQuestionsWithAI = async (req: AuthRequest, res: Response) => {
    try {
        const { id: quizId } = req.params;
        const { topic, count = 5 } = req.body;

        if (!quizId) return res.status(400).json({ errMsg: "invalid quiz id" });
        if (!topic)
            return res.status(400).json({ errMsg: "topic is required" });
        if (count > 20)
            return res.status(400).json({ errMsg: "max 20 questions allowed" });

        const quiz = await Quiz.findById(quizId).populate({
            path: "course",
            populate: { path: "teacher", select: "_id" },
        });

        if (!quiz) return res.status(404).json({ errMsg: "quiz not found" });
        if (quiz.course instanceof Types.ObjectId) {
            return res.status(500).json({ errMsg: "course was not populated" });
        }

        const teacherId =
            quiz.course.teacher instanceof Types.ObjectId
                ? quiz.course.teacher.toString()
                : quiz.course.teacher._id.toString();

        if (teacherId !== req.user?._id) {
            return res.status(403).json({ errMsg: "forbidden" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res
                .status(500)
                .json({
                    errMsg: "AI features are not configured on the server",
                });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an expert educator. Create ${count} multiple-choice questions about the following topic: "${topic}".
        Return ONLY a JSON array of objects with this exact structure:
        [
            {
                "prompt": "The question text",
                "points": 1,
                "choices": [
                    { "text": "Correct Answer", "isCorrect": true },
                    { "text": "Wrong Answer 1", "isCorrect": false },
                    { "text": "Wrong Answer 2", "isCorrect": false },
                    { "text": "Wrong Answer 3", "isCorrect": false }
                ]
            }
        ]
        Do not wrap in markdown code blocks. Just output the raw JSON array. Make sure there is exactly ONE correct answer per question, and the questions are high quality.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("Failed to extract JSON array. Raw response:", text);
            return res
                .status(500)
                .json({ errMsg: "AI returned invalid format" });
        }

        let generatedQuestions;
        try {
            generatedQuestions = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
            console.error("JSON Parse Error:", parseErr, "Raw text:", text);
            return res
                .status(500)
                .json({ errMsg: "AI returned invalid JSON data" });
        }

        const questionsToInsert = generatedQuestions.map((q: any) => ({
            quiz: quiz._id,
            questionType: "mcq_single",
            prompt: q.prompt,
            points: q.points || 1,
            orderIndex: 0,
            choices: q.choices,
        }));

        const inserted = await Question.insertMany(questionsToInsert);
        return res.status(201).json({ questions: inserted });
    } catch (error) {
        console.error("AI Generation Error:", error);
        const errMsg =
            error instanceof Error
                ? error.message
                : "failed to generate questions";
        return res.status(500).json({ errMsg });
    }
};

export {
    createQuiz,
    createQuizFromBody,
    addQuestion,
    addQuestionViaBody,
    updateQuestion,
    deleteQuestion,
    publishQuiz,
    listCourseQuizzes,
    listAvailableQuizzes,
    getQuizDetails,
    updateQuiz,
    deleteQuiz,
    generateQuestionsWithAI,
};
