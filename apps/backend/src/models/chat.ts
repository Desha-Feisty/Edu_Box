import { Schema, model, Types } from "mongoose";

export interface IChatMessage {
    course: Types.ObjectId;
    sender: Types.ObjectId;
    recipient: Types.ObjectId;
    senderRole: string;
    text: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
    {
        course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
        sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
        recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
        senderRole: {
            type: String,
            enum: ["teacher", "student"],
            required: true,
        },
        text: { type: String, required: true },
        isRead: { type: Boolean, default: false, index: true },
    },
    { timestamps: true },
);

export default model<IChatMessage>("ChatMessage", chatMessageSchema);
