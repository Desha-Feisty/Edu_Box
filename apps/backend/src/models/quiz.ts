import { Schema, model, Types } from "mongoose";
import type { ICourse } from "./course.js";

export interface IQuiz {
    course: Types.ObjectId | ICourse;
    title: string;
    description?: string;
    openAt: Date;
    closeAt: Date;
    durationMinutes: number;
    attemptsAllowed?: number;
    questionsPerAttempt?: number;
    published?: boolean;
    gradingMode?: "onSubmit" | "onClose";
    closeNotifiedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const quizSchema = new Schema<IQuiz>(
    {
    course: { type: Types.ObjectId, ref: "Course", required: true, index: true },
    title: { type: String, required: true, index: true },
    description: { type: String },
    openAt: { type: Date, required: true, index: true },
    closeAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true },
    attemptsAllowed: { type: Number, default: 1 },
    questionsPerAttempt: { type: Number },
    published: { type: Boolean, default: false, index: true },
    gradingMode: { type: String, enum: ["onSubmit", "onClose"], default: "onSubmit" },
    closeNotifiedAt: { type: Date, default: null },
},
    { timestamps: true },
);

// Compound indexes for common queries
quizSchema.index({ course: 1, published: 1 });
quizSchema.index({ course: 1, openAt: 1 });
quizSchema.index({ closeAt: 1, published: 1 });
quizSchema.index({ course: 1, closeAt: 1, published: 1 });
quizSchema.index({ title: "text" });

export default model<IQuiz>("Quiz", quizSchema);
