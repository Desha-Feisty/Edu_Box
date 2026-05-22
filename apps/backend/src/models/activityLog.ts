import { Schema, model, Types, Document } from "mongoose";

export type LogAction = 
    | "user_login"
    | "user_logout"
    | "user_created"
    | "user_deleted"
    | "quiz_created"
    | "quiz_published"
    | "quiz_unpublished"
    | "quiz_deleted"
    | "quiz_submitted"
    | "quiz_submitted_late"
    | "quiz_graded"
    | "quiz_auto_submitted"
    | "quiz_auto_submitted_late"
    | "quiz_auto_graded"
    | "course_created"
    | "course_enrolled"
    | "course_deleted"
    | "attempt_started"
    | "system_error"
    | "system_event";

export interface IActivityLog {
    user?: Types.ObjectId;
    action: LogAction;
    details: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
    user: { type: Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    details: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// TTL index: auto-delete documents older than 30 days
activityLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

export default model<IActivityLog>("ActivityLog", activityLogSchema);