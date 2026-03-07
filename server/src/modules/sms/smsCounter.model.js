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
    /* Last raw counter values received from the device (ESP32).
       Used to compute deltas so the server stays authoritative. */
    lastDeviceToday: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastDeviceMonth: {
      type: Number,
      min: 0,
      default: 0,
    },
    /* Date strings for detecting day/month rollovers */
    lastDailyReset: {
      type: String,
      default: "",
    },
    lastMonthlyReset: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SmsCounter = mongoose.model("SmsCounter", smsCounterSchema);
