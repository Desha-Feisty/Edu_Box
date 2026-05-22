import type { Request, Response } from "express";
import User from "../models/user.js";
import joi from "joi";
import type { Role } from "./user.controller.js";
import { logActivity } from "../services/logger.js";
import {
    sendCreated,
    sendSuccess,
    sendError,
    sendValidationError,
    sendConflict,
    sendUnauthorized,
    sendNotFound,
} from "../utils/response.js";
import { createError } from "../middleware/errorHandler.js";

export interface RegisterBody {
    name: string;
    email: string;
    password: string;
    role: Role;
}

export interface LoginBody {
    email: string;
    password: string;
}

const registerSchema = joi.object({
    name: joi.string().min(2).max(40).required(),
    password: joi.string().min(8).max(20).required(),
    email: joi.string().email().required(),
    role: joi.string().valid("student", "teacher", "admin").required(),
});

const loginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
});

const register = async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    try {
        const { value, error } = registerSchema.validate(req.body, {
            stripUnknown: true,
        });
        if (error) {
            const errors: Record<string, string> = {};
            error.details.forEach((detail) => {
                const field = detail.path.join(".");
                errors[field] = detail.message;
            });
            return sendValidationError(res, "Validation failed", errors);
        }

        const { name, email, password, role } = value as RegisterBody;

        // Check if user exists
        const exists = await User.findOne({ email });
        if (exists) {
            return sendConflict(res, "Email is already registered");
        }

        // Create user
        const user = await User.create({ email, name, password, role });

        // Generate tokens
        const token = await user.createToken();
        const refreshToken = await user.createRefreshToken();

        // Update login stats (single save for refreshToken + loginStats)
        await user.updateLoginStats();
        await user.save();

        // Log activity
        try {
            await logActivity({
                userId: user._id.toString(),
                action: "user_created",
                details: `New ${role} account created: ${name} (user ${user._id})`,
                ipAddress: req.ip || undefined,
                userAgent: req.get("User-Agent") || undefined,
            });
        } catch (logErr) {
            console.error("Failed to log user creation activity:", logErr);
        }

        return sendCreated(res, {
            token,
            refreshToken,
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                id: user._id,
            },
        }, "Registration successful");
    } catch (error) {
        console.error(
            "Register error:",
            error instanceof Error ? error.message : error,
        );
        return sendError(res, "Registration failed", 500);
    }
};

const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
    try {
        const { value, error } = loginSchema.validate(req.body, {
            stripUnknown: true,
        });
        if (error) {
            return sendValidationError(res, "Invalid request format");
        }

        const { email, password } = value as LoginBody;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return sendUnauthorized(res, "Email is not registered");
        }

        // Check password
        const checkPassword = await user.comparePassword(password);
        if (!checkPassword) {
            return sendUnauthorized(res, "Incorrect password");
        }

        // Generate tokens
        const token = await user.createToken();
        const refreshToken = await user.createRefreshToken();

        // Update login stats (single save for refreshToken + loginStats)
        await user.updateLoginStats();
        await user.save();

        // Log activity
        try {
            await logActivity({
                userId: user._id.toString(),
                action: "user_login",
                details: `User logged in: ${user.name} (user ${user._id})`,
                ipAddress: req.ip || undefined,
                userAgent: req.get("User-Agent") || undefined,
            });
        } catch (logErr) {
            console.error("Failed to log user login activity:", logErr);
        }

        return sendSuccess(res, {
            token,
            refreshToken,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        }, "Login successful");
    } catch (error) {
        console.error(
            "Login error:",
            error instanceof Error ? error.message : error,
        );
        return sendError(res, "Login failed", 500);
    }
};

interface AuthRequest extends Request {
    user?: { _id: string };
}

const me = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return sendUnauthorized(res);
        }

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return sendNotFound(res, "User");
        }

        return sendSuccess(res, {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin,
            loginCount: user.loginCount,
        });
    } catch (error) {
        return sendError(res, "Failed to fetch user data", 500);
    }
};

const logout = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                await user.clearRefreshToken();
                await user.save(); // Persist cleared refresh token
            }
        }

        return sendSuccess(res, null, "Logged out successfully");
    } catch (error) {
        return sendError(res, "Failed to logout", 500);
    }
};

const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return sendUnauthorized(res, "unauthenticated");
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return sendValidationError(res, "currentPassword and newPassword are required");
        }

        if (newPassword.length < 6) {
            return sendValidationError(res, "newPassword must be at least 6 characters");
        }

        const user = await User.findById(userId);
        if (!user) {
            return sendNotFound(res, "user not found");
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return sendUnauthorized(res, "current password is incorrect");
        }

        user.password = newPassword;
        await user.save();

        return sendSuccess(res, null, "Password changed successfully");
    } catch (error) {
        console.error("Change password error:", error);
        return sendError(res, "Failed to change password", 500);
    }
};

export { register, login, me, logout, changePassword };