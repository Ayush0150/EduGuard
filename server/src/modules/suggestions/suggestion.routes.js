import { Router } from "express";
import {
  requireAuth,
  requireRole,
} from "../../core/middlewares/auth.js";
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
router.get("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), listSuggestions);
router.get(
  "/spam-words",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  listSpamWords
);
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  patchSuggestionStatus
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  removeSuggestion
);

export const suggestionRouter = router;
