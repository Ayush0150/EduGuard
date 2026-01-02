import http from "../../../core/http";

/**
 * ADMIN USERS API
 * Base path handled here for consistency
 */

const BASE = "/api/v1/admin/users";

export const getUsers = async () => {
  const res = await http.get(BASE);
  return res.data.data;
};

export const getUserById = async (id) => {
  const res = await http.get(`${BASE}/${id}`);
  return res.data.data;
};

export const createUser = async (data) => {
  const res = await http.post(BASE, data);
  return res.data.data;
};

export const updateUser = async (id, data) => {
  const res = await http.put(`${BASE}/${id}`, data);
  return res.data.data;
};

export const deleteUser = async (id) => {
  const res = await http.delete(`${BASE}/${id}`);
  return res.data;
};

export const toggleUserStatus = async (id) => {
  const res = await http.patch(`${BASE}/${id}/toggle`);
  return res.data.data;
};
