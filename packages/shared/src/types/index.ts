// ============================================
// EduBox Shared Types
// ============================================

import type { UserRole, GradingMode, NotificationType, TicketStatus, TicketPriority, QuestionType, AttemptStatus } from "../constants.js";

// ============================================
// User Types
// ============================================
export interface IUser {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    points?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserResponse {
    user: IUser;
    token: string;
    refreshToken: string;
}

export interface IRegisterData {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}

export interface ILoginData {
    email: string;
    password: string;
}

// ============================================
// Course Types
// ============================================
export interface ICourse {
    _id: string;
    title: string;
    description?: string;
    joinCode: string;
    teacher: string | IUser;
    students: string[] | IUser[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateCourseData {
    title: string;
    description?: string;
}

export interface IJoinCourseData {
    joinCode: string;
}

// ============================================
// Quiz Types
// ============================================
export interface IQuiz {
    _id: string;
    course: string | ICourse;
    title: string;
    description?: string;
    openAt: Date;
    closeAt: Date;
    durationMinutes: number;
    attemptsAllowed: number;
    questionsPerAttempt?: number;
    published: boolean;
    gradingMode: GradingMode;
    aiGrading?: boolean;
    closeNotifiedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateQuizData {
    course: string;
    title: string;
    description?: string;
    openAt: Date;
    closeAt: Date;
    durationMinutes: number;
    attemptsAllowed: number;
    questionsPerAttempt?: number;
    published?: boolean;
    gradingMode?: GradingMode;
    aiGrading?: boolean;
}

export interface IQuizSubmitData {
    answers: Array<{
        questionId: string;
        selectedChoiceIds: string[];
        textAnswer?: string;
    }>;
}

// ============================================
// Question Types
// ============================================
export interface IChoice {
    _id?: string;
    text: string;
    isCorrect?: boolean;
}

export interface IQuestion {
    _id: string;
    quiz: string | IQuiz;
    questionType: QuestionType;
    prompt: string;
    points: number;
    orderIndex: number;
    choices: IChoice[];
    sampleAnswer?: string;
    rubric?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateQuestionData {
    quiz: string;
    questionType: QuestionType;
    prompt: string;
    points: number;
    orderIndex?: number;
    choices: Array<{ text: string; isCorrect?: boolean }>;
    sampleAnswer?: string;
    rubric?: string;
}

// ============================================
// Attempt Types
// ============================================
export interface IResponse {
    question: string;
    selectedChoiceIds: string[];
    textAnswer?: string;
    aiScore?: number;
    aiFeedback?: string;
    pointsAwarded?: number;
}

export interface IAttempt {
    _id: string;
    quiz: string | IQuiz;
    user: string | IUser;
    startAt: Date;
    endAt: Date;
    submittedAt?: Date;
    status?: AttemptStatus;
    score?: number;
    maxScore?: number;
    responses: IResponse[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IAttemptResponse {
    attempt: IAttempt;
    questions: IQuestion[];
}

// ============================================
// Note Types
// ============================================
export interface INote {
    _id: string;
    course: string | ICourse;
    title: string;
    content: string;
    teacher: string | IUser;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateNoteData {
    course: string;
    title: string;
    content: string;
}

// ============================================
// Comment Types
// ============================================
export interface IComment {
    _id: string;
    note: string | INote;
    user: string | IUser;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateCommentData {
    note: string;
    content: string;
}

// ============================================
// Chat Types
// ============================================
export interface IChatMessage {
    _id: string;
    course: string | ICourse;
    user: string | IUser;
    content: string;
    createdAt: Date;
}

export interface ISendMessageData {
    course: string;
    content: string;
}

// ============================================
// Notification Types
// ============================================
export interface INotification {
    _id: string;
    user: string | IUser;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

// ============================================
// Ticket Types
// ============================================
export interface ITicket {
    _id: string;
    user: string | IUser;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateTicketData {
    subject: string;
    description: string;
    priority?: TicketPriority;
}

// ============================================
// Calendar Event Types
// ============================================
export interface ICalendarEvent {
    _id: string;
    course: string | ICourse;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICreateEventData {
    course: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
}

// ============================================
// Analytics Types
// ============================================
export interface IAnalyticsOverview {
    totalUsers: number;
    totalCourses: number;
    totalQuizzes: number;
    activeUsers: number;
    recentActivity: Array<{
        type: string;
        count: number;
    }>;
}

export interface ICourseAnalytics {
    courseId: string;
    enrolledStudents: number;
    averageGrade: number;
    quizCompletionRate: number;
    topPerformers: Array<{
        user: IUser;
        score: number;
    }>;
}

// ============================================
// Leaderboard Types
// ============================================
export interface ILeaderboardEntry {
    rank: number;
    user: IUser;
    points: number;
    coursesCompleted: number;
    quizzesTaken: number;
}

// ============================================
// Grade Types
// ============================================
export interface IGrade {
    _id: string;
    student: string | IUser;
    quiz: string | IQuiz;
    course: string | ICourse;
    score: number;
    maxScore: number;
    percentage: number;
    gradedBy: "auto" | "ai";
    createdAt: Date;
}

// ============================================
// API Response Types
// ============================================
export interface IApiResponse<T> {
    success: boolean;
    data?: T;
    errMsg?: string;
    details?: string;
}

export interface IPaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================
// Auth Request Types
// ============================================
export interface IAuthRequest extends Express.Request {
    user?: {
        userId: string;
        role: UserRole;
    };
}