import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { 
    getRecentChats, 
    getRecentChatsV1, 
    getRecentChatsV2,
    getUnreadCount,
    markConversationRead,
} from "../controllers/chat.controller.js";

const router = Router();

// Backward-compatible endpoint (defaults to V1)
router.get("/recent", authMiddleware, getRecentChats);

// Explicitly versioned endpoints
router.get("/v1/recent", authMiddleware, getRecentChatsV1);
router.get("/v2/recent", authMiddleware, getRecentChatsV2);

// Unread message tracking
router.get("/unread/count", authMiddleware, getUnreadCount);
router.patch("/read", authMiddleware, markConversationRead);

export default router;
