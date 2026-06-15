import { Types } from "mongoose";
import type { IQuiz } from "../../src/models/quiz.js";
import type { IQuestion } from "../../src/models/question.js";
import type { IAttempt } from "../../src/models/attempt.js";
import type { ICourse } from "../../src/models/course.js";
import type { IUser } from "../../src/models/user.js";

let courseCounter = 0;

export function createTestCourse(overrides: Partial<ICourse> = {}): ICourse {
    courseCounter++;
    return {
        _id: new Types.ObjectId(),
        title: "Test Course",
        description: "Test Description",
        joinCode: `CRS${courseCounter}`,
        teacher: new Types.ObjectId(),
        students: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

export function createTestQuiz(overrides: Partial<IQuiz> = {}): IQuiz {
    const now = new Date();
    const openAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const closeAt = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
    
    return {
        _id: new Types.ObjectId(),
        course: new Types.ObjectId(),
        title: "Test Quiz",
        description: "Test Quiz Description",
        openAt,
        closeAt,
        durationMinutes: 60,
        attemptsAllowed: 1,
        questionsPerAttempt: undefined,
        published: false,
        gradingMode: "onSubmit",
        closeNotifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

export function createTestQuestion(overrides: Partial<IQuestion> = {}): IQuestion {
    return {
        _id: new Types.ObjectId(),
        quiz: new Types.ObjectId(),
        questionType: "mcq_single",
        prompt: "Test question?",
        points: 1,
        orderIndex: 0,
        choices: [
            { _id: new Types.ObjectId(), text: "Correct Answer", isCorrect: true },
            { _id: new Types.ObjectId(), text: "Wrong Answer 1", isCorrect: false },
            { _id: new Types.ObjectId(), text: "Wrong Answer 2", isCorrect: false },
            { _id: new Types.ObjectId(), text: "Wrong Answer 3", isCorrect: false },
        ],
        sampleAnswer: undefined,
        rubric: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

export function createWrittenQuestion(overrides: Partial<IQuestion> = {}): IQuestion {
    return createTestQuestion({
        questionType: "written",
        choices: [],
        sampleAnswer: "Sample answer for grading",
        rubric: "Check for key concepts",
        ...overrides,
    });
}

export function createTestAttempt(overrides: Partial<IAttempt> = {}): IAttempt {
    const now = new Date();
    const endAt = new Date(now.getTime() + 60 * 60 * 1000);
    
    return {
        _id: new Types.ObjectId(),
        quiz: new Types.ObjectId(),
        user: new Types.ObjectId(),
        startAt: now,
        endAt,
        submittedAt: undefined,
        status: "inProgress",
        score: 0,
        maxScore: 0,
        responses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

export function createTestUser(overrides: Partial<IUser> = {}): IUser {
    return {
        _id: new Types.ObjectId(),
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword",
        role: "student",
        points: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

export function createTestEnrollment(userId: Types.ObjectId, courseId: Types.ObjectId, role: "student" | "teacher" = "student") {
    return {
        _id: new Types.ObjectId(),
        user: userId,
        course: courseId,
        roleInCourse: role,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}