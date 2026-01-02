import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthSession } from "../../../core/auth/tokenStorage";
import {
  deleteUser,
  getUsers,
  toggleUserStatus,
} from "../services/adminUserApi";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
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
      console.error("Admin users fetch failed:", err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError("You are not authorized to access admin dashboard.");
      } else {
        setError("Something went wrong while loading users.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, username, userEmail) {
    // Prevent admin from deleting themselves
    if (userEmail === currentUser?.email) {
      setError("You cannot delete your own admin account.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    if (!confirm(`Delete user "${username}"? This action cannot be undone.`))
      return;

    try {
      await deleteUser(id);
      setSuccessMsg(`User "${username}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete user");
      setTimeout(() => setError(""), 5000);
    }
  }

  async function handleToggle(id, username, currentStatus, userEmail) {
    // Prevent admin from deactivating themselves
    if (userEmail === currentUser?.email) {
      setError("You cannot deactivate your own admin account.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    const action = currentStatus ? "deactivate" : "activate";
    if (
      !confirm(
        `${
          action.charAt(0).toUpperCase() + action.slice(1)
        } user "${username}"?`
      )
    )
      return;

    try {
      await toggleUserStatus(id);
      setSuccessMsg(`User "${username}" ${action}d successfully.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${action} user`);
      setTimeout(() => setError(""), 5000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage users, roles, and access control
            </p>
          </div>
          <Link
            to="/admin/users/create"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all"
          >
            + Create User
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-300">
            {successMsg}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading users...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No users found. Create your first user to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      Username
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">
                      Role
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {u.username}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            to={`/admin/users/${u.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Edit
                          </Link>
                          {u.email === currentUser?.email ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              (You)
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleToggle(
                                    u.id,
                                    u.username,
                                    u.isActive,
                                    u.email
                                  )
                                }
                                className="font-medium text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
                              >
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(u.id, u.username, u.email)
                                }
                                className="font-medium text-red-600 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
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
