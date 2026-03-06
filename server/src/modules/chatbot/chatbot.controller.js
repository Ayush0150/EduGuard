import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { sendError, sendSuccess } from "../../core/utils/response.js";
import { processMessage } from "./chatbot.service.js";

/**
 * POST /api/v1/chatbot
 * Process a chat message and return the assistant's response.
 */
export const chat = asyncHandler(async (req, res) => {
  const { message, clientHour } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return sendError(res, {
      status: 400,
      message: "message is required",
    });
  }

  // Limit message length to prevent abuse
  if (message.length > 500) {
    return sendError(res, {
      status: 400,
      message: "Message too long (max 500 characters)",
    });
  }

  const ctx = {};
  if (typeof clientHour === "number" && clientHour >= 0 && clientHour <= 23) {
    ctx.clientHour = clientHour;
  }

  const reply = await processMessage(message, ctx);

  return sendSuccess(res, { data: { reply } });
});
