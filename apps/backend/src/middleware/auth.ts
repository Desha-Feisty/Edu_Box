import Jwt, { type JwtPayload } from "jsonwebtoken";
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
            return res.status(500).json({
                errMsg: "Server configuration error",
            });
        }
        const payload = Jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        if (!payload || typeof payload === "string" || !payload._id || !payload.role) {
            return res.status(401).json({ errMsg: "unable to verify user" });
        }
        // Use JWT payload directly — skip DB lookup for performance
        req.user = {
            _id: payload._id.toString(),
            role: payload.role.toString(),
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
