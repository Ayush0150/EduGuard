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
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["SUPER_ADMIN", "ADMIN", "SECURITY", "MAINTENANCE", "PRINCIPAL"],
      default: "ADMIN",
    },
    isActive: { type: Boolean, default: true },

    resetOtpHash: { type: String, default: null },
    resetOtpExpiresAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
