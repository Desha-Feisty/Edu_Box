import { Schema, model, Model } from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
dotenv.config();
export interface IUser {
    name: string;
    email: string;
    password: string;
    role: string;
    refreshToken?: string;
    refreshTokenExpires?: Date;
    lastLogin?: Date;
    loginCount?: number;
}
interface UserMethods {
    comparePassword(enteredPassword: string): Promise<boolean>;
    createToken(): Promise<string>;
    createRefreshToken(): Promise<string>;
    validateRefreshToken(token: string): Promise<boolean>;
    clearRefreshToken(): Promise<void>;
    updateLoginStats(): Promise<void>;
}
type UserModel = Model<IUser, {}, UserMethods>;
const userSchema = new Schema<IUser, UserModel, UserMethods>(
    {
        name: {
            type: String,
            required: true,
            maxlength: 40,
            minlength: 2,
        },
        email: {
            type: String,
            required: true,
            match: /^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$/,
            unique: true,
        },
        password: {
            type: String,
            minlength: 8,
            // Note: bcrypt hashes are 60 characters, so we don't set maxlength here
            // The hash is generated in the pre-save hook
        },
        role: {
            type: String,
            enum: ["teacher", "student", "admin"],
            required: true,
        },
        refreshToken: {
            type: String,
            select: false,
        },
        refreshTokenExpires: {
            type: Date,
            select: false,
        },
        lastLogin: {
            type: Date,
        },
        loginCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
);

// Database indexes for performance
userSchema.index({ name: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

userSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
    enteredPassword: string,
): Promise<boolean> {
    const check = await bcrypt.compare(enteredPassword, this.password);
    return check;
};

userSchema.methods.createToken = async function () {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("JWT_SECRET is missing during token generation!");
        throw new Error("JWT secret is not found");
    }
    const expiresIn: StringValue | number = (process.env.JWT_LIFETIME ??
        "1h") as StringValue;
    if (!expiresIn) throw new Error("Token expiresIn is undefined");
    const token = jwt.sign(
        { _id: this._id.toString(), role: this.role },
        secret,
        {
            expiresIn,
        },
    );
    return token;
};

userSchema.methods.createRefreshToken = async function () {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        console.error("JWT_REFRESH_SECRET is missing!");
        throw new Error("Refresh token secret not found");
    }
    // Refresh token valid for 7 days
    const token = jwt.sign(
        { _id: this._id.toString(), type: "refresh" },
        secret,
        { expiresIn: "7d" },
    );
    // Store hash of refresh token (caller must save)
    const salt = await bcrypt.genSalt(10);
    this.refreshToken = await bcrypt.hash(token, salt);
    this.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return token;
};

userSchema.methods.validateRefreshToken = async function (token: string): Promise<boolean> {
    if (!this.refreshToken || !this.refreshTokenExpires) {
        return false;
    }
    // Check if expired
    if (new Date() > this.refreshTokenExpires) {
        await this.clearRefreshToken();
        return false;
    }
    return bcrypt.compare(token, this.refreshToken);
};

userSchema.methods.clearRefreshToken = async function (): Promise<void> {
    this.refreshToken = undefined as unknown as string;
    this.refreshTokenExpires = undefined as unknown as Date;
    // Caller must save after calling this
};

userSchema.methods.updateLoginStats = async function (): Promise<void> {
    this.lastLogin = new Date();
    this.loginCount = (this.loginCount || 0) + 1;
    // Caller must save after calling this
};

export default model<IUser, UserModel>("User", userSchema);
