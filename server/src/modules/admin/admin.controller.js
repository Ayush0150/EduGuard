import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { createUser } from "./admin.service.js";

export const postCreateUser = asyncHandler(async (req, res) => {
  const result = await createUser(req.body);
  if (!result.ok) {
    return res
      .status(result.status ?? 400)
      .json({ success: false, message: result.message ?? "Request failed" });
  }

  return res.status(201).json({ success: true, data: result.data });
});
