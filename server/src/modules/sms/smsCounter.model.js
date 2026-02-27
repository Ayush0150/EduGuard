import mongoose from "mongoose";

const smsCounterSchema = new mongoose.Schema(
  {
    device: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },
    smsToday: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    smsMonth: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SmsCounter = mongoose.model("SmsCounter", smsCounterSchema);
