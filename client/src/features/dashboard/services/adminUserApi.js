import http from "../../../core/http";

/**
 * =====================================================
 * Admin Users API
 * =====================================================
 * Centralized service for admin user management.
 *
 * Benefits:
 * - Single source of truth for endpoints
 * - Clean return values
 * - Easy to extend (pagination, filters, search)
 * - Consistent error handling
 * =====================================================
 */

const BASE_URL = "/api/v1/admin/users";

/* -----------------------------------------------------
   Fetch all users
----------------------------------------------------- */
export async function getUsers() {
  const { data } = await http.get(BASE_URL);
  return data.data;
}

/* -----------------------------------------------------
   Fetch single user by ID
----------------------------------------------------- */
export async function getUserById(id) {
  if (!id) throw new Error("User ID is required");

  const { data } = await http.get(`${BASE_URL}/${id}`);
  return data.data;
}

/* -----------------------------------------------------
   Create new user
----------------------------------------------------- */
export async function createUser(payload) {
  if (!payload) throw new Error("Payload is required");

  const { data } = await http.post(BASE_URL, payload);
  return data.data;
}

/* -----------------------------------------------------
   Update user
----------------------------------------------------- */
export async function updateUser(id, payload) {
  if (!id) throw new Error("User ID is required");

  const { data } = await http.put(`${BASE_URL}/${id}`, payload);
  return data.data;
}

/* -----------------------------------------------------
   Delete user
----------------------------------------------------- */
export async function deleteUser(id) {
  if (!id) throw new Error("User ID is required");

  const { data } = await http.delete(`${BASE_URL}/${id}`);
  return data;
}

/* -----------------------------------------------------
   Toggle active / inactive status
----------------------------------------------------- */
export async function toggleUserStatus(id) {
  if (!id) throw new Error("User ID is required");

  const { data } = await http.patch(`${BASE_URL}/${id}/status`);
  return data.data;
}
