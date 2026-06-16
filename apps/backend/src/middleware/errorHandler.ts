import type { Request, Response, NextFunction } from "express";
import { sendInternalError } from "../utils/response.js";

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    details?: unknown;
    code?: number;
    keyValue?: Record<string, unknown>;
}

export const createError = (message: string, statusCode: number, details?: unknown): AppError => {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    error.details = details;
    return error;
};

export const errorHandler = (
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction,
): Response => {
    const statusCode = err.statusCode || 500;
    const isDev = process.env.NODE_ENV === "development";

    // Log error in development
    if (isDev) {
        console.error("Error:", {
            message: err.message,
            statusCode: err.statusCode,
            stack: err.stack,
            details: err.details,
        });
    }

    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            error: "Validation Error",
            message: "Invalid input data",
            details: isDev ? err.message : undefined,
        });
    }

    // Handle Mongoose duplicate key errors
    if (err.code === 11000 && err.keyValue) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            error: "Duplicate Error",
            message: `${field || "Field"} already exists`,
        });
    }

    // Handle Mongoose cast errors (invalid ObjectId)
    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            error: "Invalid ID",
            message: "Invalid resource ID format",
        });
    }

    // Handle Multer errors (file upload)
    if (err.name === "MulterError") {
        const messages: Record<string, string> = {
            LIMIT_FILE_SIZE: "File too large. Maximum size is 10MB.",
            LIMIT_UNEXPECTED_FILE: "Unexpected file field",
            LIMIT_FIELD_KEY: "Invalid field name",
        };
        return res.status(400).json({
            success: false,
            error: messages[(err as any).code] || err.message,
            message: messages[(err as any).code] || err.message,
        });
    }

    // Handle custom file filter rejection
    if (err.message?.includes("Only PDF, DOCX, and TXT")) {
        return res.status(400).json({
            success: false,
            error: err.message,
            message: err.message,
        });
    }

    // Handle JWT errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            error: "Invalid Token",
            message: "Invalid or malformed token",
        });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            error: "Token Expired",
            message: "Your session has expired. Please login again.",
            details: "jwt expired",
        });
    }

    // Operational errors (known errors)
    if (err.isOperational) {
        const response: Record<string, unknown> = {
            success: false,
            error: err.message,
            message: err.message,
        };
        if (isDev && err.details) {
            response.details = err.details;
        }
        return res.status(statusCode).json(response);
    }

    // Unknown errors
    return sendInternalError(res, isDev ? err.message : undefined, isDev);
};

export const asyncHandler = <T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export const notFoundHandler = (_req: Request, res: Response): Response => {
    return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "The requested resource does not exist",
    });
};