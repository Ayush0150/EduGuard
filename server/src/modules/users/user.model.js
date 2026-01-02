import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "SECURITY",
        "MAINTENANCE",
        "PRINCIPAL",
        "USER",
      ],
      default: "USER",
    },
    isActive: { type: Boolean, default: true },

    resetOtpHash: { type: String, default: null },
    resetOtpExpiresAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Performance indexes for frequent queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 }); // Compound index for admin queries
userSchema.index(
  { resetOtpExpiresAt: 1 },
  { sparse: true, expireAfterSeconds: 0 }
); // TTL index

export const User = mongoose.model("User", userSchema);
