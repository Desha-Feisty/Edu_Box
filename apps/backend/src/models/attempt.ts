import { Schema, model, Types, Document } from "mongoose";
import type { IQuiz } from "./quiz.js";
export type ContestStatus = "pending" | "resolved" | "none";

export interface IResponse {
    question: Types.ObjectId;
    selectedChoiceIds: Types.ObjectId[];
    textAnswer?: string;
    aiScore?: number | null;
    aiFeedback?: string;
    pointsAwarded?: number;
    contestReason?: string;
    contestStatus?: ContestStatus;
    contestedAt?: Date;
}

const responseSchema = new Schema<IResponse>({
    question: { type: Types.ObjectId, ref: "Question", required: true },
    selectedChoiceIds: [{ type: Types.ObjectId }],
    textAnswer: { type: String },
    aiScore: { type: Number },
    aiFeedback: { type: String },
    pointsAwarded: { type: Number, default: 0 },
    contestReason: { type: String },
    contestStatus: { type: String, enum: ["pending", "resolved", "none"], default: "none" },
    contestedAt: { type: Date },
});

export type AttemptStatus = "inProgress" | "graded" | "expired" | "late" | "submitted";
export interface IAttempt {
    quiz: Types.ObjectId | Document<IQuiz>;
    user: Types.ObjectId;
    startAt: Date;
    endAt: Date;
    submittedAt?: Date;
    status?: AttemptStatus;
    score?: number;
    maxScore?: number;
    responses: IResponse[];
    hasContestedResponses?: boolean;
}

const attemptSchema = new Schema<IAttempt>(
    {
        quiz: { type: Types.ObjectId, ref: "Quiz", required: true, index: true },
        user: { type: Types.ObjectId, ref: "User", required: true, index: true },
        startAt: { type: Date, required: true, index: true },
        endAt: { type: Date, required: true, index: true },
        submittedAt: { type: Date, index: true },
        status: {
            type: String,
            enum: ["inProgress", "graded", "expired", "late", "submitted"],
            index: true,
        },
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 0 },
        responses: [responseSchema],
        hasContestedResponses: { type: Boolean, default: false, index: true },
    },
    { timestamps: true },
);

// Compound indexes for common queries
attemptSchema.index({ quiz: 1, user: 1 });
attemptSchema.index({ quiz: 1, status: 1 });
attemptSchema.index({ user: 1, quiz: 1, status: 1 });
attemptSchema.index({ user: 1, status: 1 });
attemptSchema.index({ status: 1, endAt: 1 });
attemptSchema.index({ user: 1, quiz: 1, status: 1, submittedAt: -1 });
attemptSchema.index({ quiz: 1, status: 1, submittedAt: -1 });
attemptSchema.index({ user: 1, createdAt: -1 });

export default model<IAttempt>("Attempt", attemptSchema);
