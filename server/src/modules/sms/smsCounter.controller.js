import { asyncHandler } from "../../core/utils/asyncHandler.js";
import {
  deleteSmsCounter,
  getSmsCounter,
  listSmsCounters,
  upsertSmsCounter,
} from "./smsCounter.service.js";

export const getAllSmsCounters = asyncHandler(async (_req, res) => {
  const result = await listSmsCounters();
  return res.status(200).json({ success: true, data: result.data });
});

export const getSmsCounterByDevice = asyncHandler(async (req, res) => {
  const result = await getSmsCounter(req.params.device);
  if (!result.ok) {
    return res.status(result.status ?? 404).json({
      success: false,
      message: result.message,
    });
  }
  return res.status(200).json({ success: true, data: result.data });
});

export const putSmsCounter = asyncHandler(async (req, res) => {
  const result = await upsertSmsCounter(req.params.device, req.body);
  if (!result.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message,
    });
  }
  return res.status(200).json({ success: true, data: result.data });
});

export const deleteSmsCounterByDevice = asyncHandler(async (req, res) => {
  const result = await deleteSmsCounter(req.params.device);
  if (!result.ok) {
    return res.status(result.status ?? 404).json({
      success: false,
      message: result.message,
    });
  }
  return res.status(200).json({ success: true });
});
