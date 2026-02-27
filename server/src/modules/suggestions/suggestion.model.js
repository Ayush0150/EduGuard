import mongoose from "mongoose";

/**
 * Suggestion Schema
 * -----------------
 * Stores user feedback/suggestions submitted via the About page.
 */

const suggestionSchema = new mongoose.Schema(
  {
    /** Name of the person submitting */
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    /** Feedback / suggestion text */
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },

    /** Optional category tag */
    category: {
      type: String,
      enum: ["general", "feature", "bug", "improvement", "other"],
      default: "general",
    },

    /** Originating device (for context) */
    device: {
      type: String,
      default: "web-dashboard",
    },

    /** Workflow status */
    status: {
      type: String,
      enum: ["pending", "workspace", "done"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

suggestionSchema.index({ createdAt: -1 });
suggestionSchema.index({ status: 1, createdAt: -1 });

export const Suggestion = mongoose.model("Suggestion", suggestionSchema);
