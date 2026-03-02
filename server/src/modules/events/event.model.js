import mongoose from "mongoose";

/**
 * Event Schema
 * ------------
 * Stores classroom events detected from ESP32 telemetry.
 * Used for persistent reports that survive page/server restarts.
 */

const eventSchema = new mongoose.Schema(
  {
    /** Event type key matching client EVENT_DEFS */
    type: {
      type: String,
      required: true,
      enum: [
        "emergency",
        "acRequest",
        "washroom",
        "teacherAbsent",
        "teacherPresent",
        "periodChange",
      ],
      index: true,
    },

    /** High-level category for filtering */
    category: {
      type: String,
      required: true,
      enum: ["alert", "attendance"],
      index: true,
    },

    /** Severity level */
    severity: {
      type: String,
      required: true,
      enum: ["critical", "warning", "info"],
    },

    /** Optional descriptive detail */
    detail: {
      type: String,
      default: null,
    },

    /** Flexible metadata (Room, Period, Gas Level, etc.) */
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /** Originating device */
    device: {
      type: String,
      default: "CLASSROOM-706",
      index: true,
    },

    /** Event timestamp (from client-side detection) */
    ts: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* Compound index for dedup queries & common filter patterns */
eventSchema.index({ device: 1, type: 1, ts: -1 });
eventSchema.index({ category: 1, ts: -1 });

export const Event = mongoose.model("Event", eventSchema);
