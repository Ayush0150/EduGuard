import { asyncHandler } from "../../core/utils/asyncHandler.js";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "./admin.service.js";

/* CREATE USER */
export const postCreateUser = asyncHandler(async (req, res) => {
  const result = await createUser(req.body);

  if (!result.ok) {
    return res
      .status(result.status ?? 400)
      .json({ success: false, message: result.message });
  }

  return res.status(201).json({ success: true, data: result.data });
});

/* GET ALL USERS */
export const getUsers = asyncHandler(async (req, res) => {
  const result = await getAllUsers();

  if (!result.ok) {
    return res
      .status(result.status ?? 500)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json(result.data);
});

/* GET USER BY ID */
export const getUser = asyncHandler(async (req, res) => {
  const result = await getUserById(req.params.id);

  if (!result.ok) {
    return res
      .status(result.status ?? 404)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json(result.data);
});

/* UPDATE USER */
export const putUpdateUser = asyncHandler(async (req, res) => {
  const result = await updateUser(req.params.id, req.body);

  if (!result.ok) {
    return res
      .status(result.status ?? 400)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true, data: result.data });
});

/* DELETE USER */
export const deleteUserById = asyncHandler(async (req, res) => {
  const result = await deleteUser(req.params.id);

  if (!result.ok) {
    return res
      .status(result.status ?? 400)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true });
});

/* TOGGLE USER STATUS */
export const patchToggleUserStatus = asyncHandler(async (req, res) => {
  const result = await toggleUserStatus(req.params.id);

  if (!result.ok) {
    return res
      .status(result.status ?? 400)
      .json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true, data: result.data });
});
