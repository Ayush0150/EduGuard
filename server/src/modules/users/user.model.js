import mongoose from "mongoose";

/**
 * User Schema
 * -----------
 * Central identity model for EduGuard system.
 *
 * Stores:
 * - authentication credentials
 * - role-based access control
 * - account status
 * - password recovery metadata
 */

const userSchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------
       Core Identity
    --------------------------------------------------- */

    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default
    },

    /* ---------------------------------------------------
       Authorization
    --------------------------------------------------- */

    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "SECURITY",
        "MAINTENANCE",
        "PRINCIPAL",
        "USER",
      ],
      default: "USER",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /* ---------------------------------------------------
       Password Recovery
    --------------------------------------------------- */

    resetOtpHash: {
      type: String,
      default: null,
      select: false,
    },

    resetOtpExpiresAt: {
      type: Date,
      default: null,
      select: false, // protect expiry metadata
    },

    resetTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    resetTokenExpiresAt: {
      type: Date,
      default: null,
      select: false, // protect expiry metadata
    },

    /* ---------------------------------------------------
       Admin Login OTP (MFA)
    --------------------------------------------------- */

    adminLoginOtpHash: {
      type: String,
      default: null,
      select: false,
    },

    adminLoginOtpExpiresAt: {
      type: Date,
      default: null,
      select: false, // 🔥 REQUIRED
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =====================================================
   Indexes (performance + integrity)
===================================================== */

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });

/* =====================================================
   Model Export
===================================================== */

export const User = mongoose.model("User", userSchema);
