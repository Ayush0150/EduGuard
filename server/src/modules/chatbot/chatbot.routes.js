import { Router } from "express";
import { requireAuth } from "../../core/middlewares/auth.js";
import { chat } from "./chatbot.controller.js";

const router = Router();

/**
 * Chatbot Routes
 * --------------
 * POST / — Process a chat message (requires auth)
 */
router.post("/", requireAuth, chat);

export const chatbotRouter = router;
