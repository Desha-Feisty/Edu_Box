import { Schema, model, Types, Document } from "mongoose";

export type NotificationType = "quiz" | "quiz-graded" | "quiz-missed" | "note" | "chat" | "system" | "ticket" | "calendar-event" | "contest-submitted" | "contest-resolved";

export interface INotification {
    user: Types.ObjectId;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
    read: boolean;
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
            type: String,
            enum: ["quiz", "quiz-graded", "quiz-missed", "note", "chat", "system", "ticket", "calendar-event", "contest-submitted", "contest-resolved"],
            required: true,
            index: true,
        },
        link: { type: String },
        read: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

// Compound indexes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default model<INotification>("Notification", notificationSchema);
