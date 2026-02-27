import { Router } from "express";
import {
  createSuggestion,
  listSpamWords,
  listSuggestions,
  patchSuggestionStatus,
  removeSuggestion,
} from "./suggestion.controller.js";

const router = Router();

/**
 * Suggestion Routes
 * -----------------
 * POST   /                — Submit a new suggestion/feedback
 * GET    /                — Retrieve all suggestions
 * GET    /spam-words      — Get the list of blocked spam words
 * PATCH  /:id/status      — Update suggestion workflow status
 * DELETE /:id             — Delete a suggestion
 */
router.post("/", createSuggestion);
router.get("/", listSuggestions);
router.get("/spam-words", listSpamWords);
router.patch("/:id/status", patchSuggestionStatus);
router.delete("/:id", removeSuggestion);

export const suggestionRouter = router;
