import { Schema, model, Types } from "mongoose";
import type { IQuiz } from "./quiz.js";

export interface IChoice {
    _id?: string;
    text: string;
    isCorrect?: boolean;
}

const choiceSchema = new Schema<IChoice>(
    {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
    },
    { _id: true }
);

export type QuestionType = "mcq_single" | "written";

export interface IQuestion {
    quiz: Types.ObjectId | IQuiz;
    questionType: QuestionType;
    prompt: string;
    points: number;
    orderIndex: number;
    choices: IChoice[];
    sampleAnswer?: string;
    rubric?: string;
}

const questionSchema = new Schema<IQuestion>(
    {
        quiz: { type: Types.ObjectId, ref: "Quiz", required: true },
        questionType: { type: String, required: true },
        prompt: { type: String, required: true },
        points: { type: Number, default: 1 },
        orderIndex: { type: Number, default: 0 },
        choices: [choiceSchema],
        sampleAnswer: { type: String },
        rubric: { type: String },
    },
    { timestamps: true }
);

export default model<IQuestion>("Question", questionSchema);
