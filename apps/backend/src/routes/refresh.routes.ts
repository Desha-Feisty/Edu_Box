import { Router } from "express";
import joi from "joi";
import User from "../models/user.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendSuccess, sendError, sendUnauthorized } from "../utils/response.js";
import jwt from "jsonwebtoken";

const router = Router();

const refreshSchema = joi.object({
    refreshToken: joi.string().required(),
});

// POST /api/auth/refresh - Refresh access token
router.post(
    "/",
    validate({ body: refreshSchema }),
    async (req, res) => {
        try {
            const { refreshToken } = req.body;

            // Verify refresh token
            const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
            if (!secret) {
                return sendError(res, "Server configuration error", 500);
            }

            let decoded: jwt.JwtPayload;
            try {
                decoded = jwt.verify(refreshToken, secret) as jwt.JwtPayload;
            } catch {
                return sendUnauthorized(res, "Invalid or expired refresh token");
            }

            if (decoded.type !== "refresh") {
                return sendUnauthorized(res, "Invalid token type");
            }

            // Find user and validate stored refresh token
            const user = await User.findById(decoded._id);
            if (!user) {
                return sendUnauthorized(res, "User not found");
            }

            const isValid = await user.validateRefreshToken(refreshToken);
            if (!isValid) {
                // Persist the cleared refresh token state
                await user.save();
                return sendUnauthorized(res, "Invalid or expired refresh token");
            }

            // Generate new access token
            const accessToken = await user.createToken();

            // Optionally rotate refresh token
            const newRefreshToken = await user.createRefreshToken();
            await user.save(); // Persist refresh token rotation

            return sendSuccess(res, {
                token: accessToken,
                refreshToken: newRefreshToken,
            }, "Token refreshed successfully");
        } catch (error) {
            console.error("Refresh token error:", error);
            return sendError(res, "Failed to refresh token", 500);
        }
    },
);

export default router;