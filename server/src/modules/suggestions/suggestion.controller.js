import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { sendSuccess } from "../../core/utils/response.js";
import {
  deleteSuggestion,
  getSpamWords,
  getSuggestions,
  saveSuggestion,
  updateSuggestionStatus,
} from "./suggestion.service.js";

/**
 * POST /api/v1/suggestions
 * Submit a new suggestion/feedback.
 */
export const createSuggestion = asyncHandler(async (req, res) => {
  const { name, message, category } = req.body;

  const result = await saveSuggestion({ name, message, category });

  if (!result.ok) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  return sendSuccess(res, {
    status: 201,
    message: "Thank you for your feedback!",
    data: result.data,
  });
});

/**
 * GET /api/v1/suggestions
 * Retrieve suggestions (query params: category, status, page, limit, q, sortBy, sortOrder).
 */
export const listSuggestions = asyncHandler(async (req, res) => {
  const result = await getSuggestions(req.query);
  // Return pagination at root level (sendSuccess only passes data/message)
  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * PATCH /api/v1/suggestions/:id/status
 * Update the workflow status of a suggestion.
 */
export const patchSuggestionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const result = await updateSuggestionStatus(req.params.id, status);

  if (!result.ok) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  return sendSuccess(res, {
    message: `Suggestion marked as ${status}`,
    data: result.data,
  });
});

/**
 * DELETE /api/v1/suggestions/:id
 * Permanently delete a suggestion.
 */
export const removeSuggestion = asyncHandler(async (req, res) => {
  const result = await deleteSuggestion(req.params.id);

  if (!result.ok) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }

  return sendSuccess(res, { message: "Suggestion deleted" });
});

/**
 * GET /api/v1/suggestions/spam-words
 * Return the spam word list (admin use).
 */
export const listSpamWords = asyncHandler(async (_req, res) => {
  return sendSuccess(res, { data: getSpamWords() });
});
