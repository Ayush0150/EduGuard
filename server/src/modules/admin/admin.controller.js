import { asyncHandler } from "../../core/utils/asyncHandler.js";

import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "./admin.service.js";

/**
 * =====================================================
 * Admin Controller
 * =====================================================
 *
 * Responsibilities:
 * - Handle admin HTTP requests
 * - Delegate business logic to service layer
 * - Format API responses
 *
 * Business logic MUST NOT exist here.
 */

/* =====================================================
   Create User
===================================================== */

/**
 * POST /api/v1/admin/users
 */
export const postCreateUser = asyncHandler(async (req, res) => {
  const result = await createUser(req.body);

  if (!result.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message,
    });
  }

  return res.status(201).json({
    success: true,
    data: result.data,
  });
});

/* =====================================================
   Get All Users
===================================================== */

/**
 * GET /api/v1/admin/users
 */
export const getUsers = asyncHandler(async (_req, res) => {
  const result = await getAllUsers();

  if (!result.ok) {
    return res.status(result.status ?? 500).json({
      success: false,
      message: result.message,
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/* =====================================================
   Get User By ID
===================================================== */

/**
 * GET /api/v1/admin/users/:id
 */
export const getUser = asyncHandler(async (req, res) => {
  const result = await getUserById(req.params.id);

  if (!result.ok) {
    return res.status(result.status ?? 404).json({
      success: false,
      message: result.message,
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/* =====================================================
   Update User
===================================================== */

/**
 * PUT /api/v1/admin/users/:id
 */
export const putUpdateUser = asyncHandler(async (req, res) => {
  const result = await updateUser(req.params.id, req.body);

  if (!result.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message,
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/* =====================================================
   Delete User
===================================================== */

/**
 * DELETE /api/v1/admin/users/:id
 */
export const deleteUserById = asyncHandler(async (req, res) => {
  const result = await deleteUser(req.params.id);

  if (!result.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message,
    });
  }

  return res.status(200).json({
    success: true,
  });
});

/* =====================================================
   Toggle User Status
===================================================== */

/**
 * PATCH /api/v1/admin/users/:id/status
 */
export const patchToggleUserStatus = asyncHandler(async (req, res) => {
  const result = await toggleUserStatus(req.params.id);

  if (!result.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message,
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});
