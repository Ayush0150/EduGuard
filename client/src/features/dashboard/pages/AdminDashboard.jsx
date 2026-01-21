/**
 * AdminDashboard
 * --------------
 * Modern User management panel.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthSession } from "../../../core/auth/tokenStorage";
import { toast } from "../../../core/utils/toastEmitter";
import {
  deleteUser,
  getUsers,
  toggleUserStatus,
} from "../services/adminUserApi";

export default function AdminDashboard() {
  const [{ user: currentUser }] = useState(() => getAuthSession());
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.response?.status === 403 ? "Access Denied" : "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleDelete(id, username, email) {
    if (email === currentUser?.email)
      return toast.error("Cannot delete yourself");
    if (!window.confirm(`Delete "${username}"?`)) return;
    try {
      await deleteUser(id);
      toast.success("User deleted");
      loadUsers();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleToggle(id, username, isActive, email) {
    if (email === currentUser?.email) return toast.error("Cannot modify self");
    try {
      await toggleUserStatus(id);
      toast.success(`${username} ${isActive ? "deactivated" : "activated"}`);
      loadUsers();
    } catch {
      toast.error("Action failed");
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
            Users
          </h1>
          <p className="mt-1 text-sm font-medium text-surface-500">
            Manage accounts and access.
          </p>
        </div>
        <Link
          to="/admin/users/create"
          className="inline-flex items-center justify-center gap-2 rounded-none bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-700 hover:-translate-y-0.5"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add user
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div className="rounded-none border border-surface-200 bg-white p-2 dark:border-surface-800 dark:bg-surface-900 shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-surface-400">
                  User
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-surface-400">
                  Role
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-surface-400">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-surface-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50 dark:divide-surface-800/50">
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="py-20 text-center text-surface-400 font-medium"
                  >
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="py-20 text-center text-surface-400"
                  >
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="group transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/30"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-none bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-surface-900 dark:text-white leading-tight">
                            {u.username}
                          </p>
                          <p className="text-xs text-surface-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center rounded-none bg-surface-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-surface-600 dark:bg-surface-800 dark:text-surface-400">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold ${u.isActive ? "text-green-600" : "text-surface-400"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-green-600 animate-pulse" : "bg-surface-300"}`}
                        />
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {u.email !== currentUser?.email && (
                          <>
                            <Link
                              to={`/admin/users/${u.id}`}
                              className="rounded-none p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800"
                              title="Edit User"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5h2m-1-1v2m8 4H4m16 0l-1.5 8.5a2 2 0 01-2 1.5H7.5a2 2 0 01-2-1.5L4 10"
                                />
                              </svg>
                            </Link>
                            <button
                              onClick={() =>
                                handleToggle(
                                  u.id,
                                  u.username,
                                  u.isActive,
                                  u.email
                                )
                              }
                              className="rounded-none p-2 text-surface-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20"
                              title={
                                u.isActive
                                  ? "Suspend Account"
                                  : "Activate Account"
                              }
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(u.id, u.username, u.email)
                              }
                              className="rounded-none p-2 text-surface-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                              title="Delete User"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
