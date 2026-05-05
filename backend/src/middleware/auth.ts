import Jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/user.js";
import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../types/authRequest.js";
import dotenv from "dotenv";
dotenv.config();
const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;
        if (!token) {
            return res.status(401).json({ errMsg: "unauthenticated" });
        }
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing from environment variables!");
            return res.status(500).json({
                errMsg: "could not verify user",
                debug: "JWT_SECRET_MISSING",
            });
        }
        const payload = Jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        if (!payload || typeof payload === "string" || !payload._id) {
            return res.status(500).json({ errMsg: "error verify user" });
        }
        const user = await User.findById(payload._id);
        if (!user) {
            return res.status(401).json({ errMsg: "user not found" });
        }
        req.user = {
            _id: user._id.toString(),
            role: user.role,
        };
        return next();
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "unknown error";
        console.error("JWT verification error:", message);
        return res.status(401).json({
            errMsg: "unable to verify user",
        });
    }
};

function requireRole(role: string) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (req.user?.role !== role) {
            return res.status(403).json({ errMsg: "forbidden" });
        }
        return next();
    };
}
export { authMiddleware, requireRole };
