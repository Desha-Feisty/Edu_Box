import { Schema, model, Types, Document } from "mongoose";
import type { IQuiz } from "./quiz.js";
export interface IResponse {
    question: Types.ObjectId;
    selectedChoiceIds: [Types.ObjectId];
    pointsAwarded?: number;
}

const responseSchema = new Schema<IResponse>({
    question: { type: Types.ObjectId, ref: "Question", required: true },
    selectedChoiceIds: [{ type: Types.ObjectId }],
    pointsAwarded: { type: Number, default: 0 },
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
}

const attemptSchema = new Schema<IAttempt>(
    {
        quiz: { type: Types.ObjectId, ref: "Quiz", required: true },
        user: { type: Types.ObjectId, ref: "User", required: true },
        startAt: { type: Date, required: true },
        endAt: { type: Date, required: true },
        submittedAt: { type: Date },
        status: {
            type: String,
            enum: ["inProgress", "graded", "expired", "late", "submitted"],
        },
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 0 },
        responses: [responseSchema],
    },
    { timestamps: true },
);

attemptSchema.index({ quiz: 1, status: 1 });
attemptSchema.index({ user: 1, quiz: 1, status: 1 });
attemptSchema.index({ user: 1, status: 1 });
attemptSchema.index({ status: 1, endAt: 1 });
attemptSchema.index({ user: 1, quiz: 1, status: 1, submittedAt: -1 });
attemptSchema.index({ quiz: 1, status: 1, submittedAt: -1 });

export default model<IAttempt>("Attempt", attemptSchema);
