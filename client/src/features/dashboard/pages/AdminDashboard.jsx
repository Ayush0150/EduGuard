import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthSession } from "../../../core/auth/tokenStorage";
import { toast } from "../../../core/utils/toastEmitter";
import {
  deleteUser,
  getUsers,
  toggleUserStatus,
} from "../services/adminUserApi";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user: currentUser } = getAuthSession();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Admin users fetch failed:", err);
      }
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError(
          "You are not authorized to access this page. Please contact an administrator."
        );
      } else {
        setError(
          "Unable to load users. Please refresh the page or try again later."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, username, userEmail) {
    // Prevent admin from deleting themselves
    if (userEmail === currentUser?.email) {
      toast.error("You cannot delete your own admin account.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${username}"?\n\nThis action cannot be undone and will permanently remove the user and their data.`
      )
    )
      return;

    try {
      await deleteUser(id);
      toast.success(`User "${username}" deleted successfully.`);
      loadUsers();
    } catch {
      toast.error("Failed to delete user. Please try again.");
    }
  }

  async function handleToggle(id, username, currentStatus, userEmail) {
    // Prevent admin from deactivating themselves
    if (userEmail === currentUser?.email) {
      toast.error("You cannot deactivate your own admin account.");
      return;
    }

    const action = currentStatus ? "deactivate" : "activate";
    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
    if (
      !confirm(
        `${actionLabel} user "${username}"?\n\n${
          currentStatus
            ? "The user will no longer be able to log in."
            : "The user will regain access to their account."
        }`
      )
    )
      return;

    try {
      await toggleUserStatus(id);
      toast.success(`User "${username}" ${action}d successfully.`);
      loadUsers();
    } catch {
      toast.error(`Failed to ${action} user. Please try again.`);
    }
  }

  const stats = [
    {
      label: "Total Users",
      value: users.length,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      bgClass: "bg-indigo-100 dark:bg-indigo-500/20",
      textClass: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Active Users",
      value: users.filter((u) => u.isActive).length,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgClass: "bg-green-100 dark:bg-green-500/20",
      textClass: "text-green-600 dark:text-green-400",
    },
    {
      label: "Inactive Users",
      value: users.filter((u) => !u.isActive).length,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgClass: "bg-red-100 dark:bg-red-500/20",
      textClass: "text-red-600 dark:text-red-400",
    },
    {
      label: "Admin Accounts",
      value: users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN")
        .length,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      bgClass: "bg-purple-100 dark:bg-purple-500/20",
      textClass: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                User Management
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Manage users, roles, and permissions
              </p>
            </div>
            <Link
              to="/admin/users/create"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create User
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && users.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 p-6 shadow-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${stat.bgClass} ${stat.textClass}`}
                  >
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Loading users...
              </p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-16 text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              No users found
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Get started by creating your first user
            </p>
            <Link
              to="/admin/users/create"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create User
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      User
                    </th>
                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      Email
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      Role
                    </th>
                    <th className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {u.username}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            u.isActive
                              ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300"
                              : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          {u.email === currentUser?.email ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                              Current User
                            </span>
                          ) : (
                            <>
                              <Link
                                to={`/admin/users/${u.id}`}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                              >
                                Edit
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
                                className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                              >
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(u.id, u.username, u.email)
                                }
                                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
