import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUser } from "../services/adminUserApi";

export default function CreateUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    role: "USER",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await createUser({ ...form, isActive: true });
      navigate("/admin");
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to create user"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 sm:px-6">
      <div className="w-full max-w-md sm:max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
            Create New User
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add a new user and assign a role
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="px-5 sm:px-6 py-5 sm:py-6 space-y-4"
        >
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Username
            </label>
            <input
              name="username"
              value={form.username}
              onChange={updateField}
              required
              autoComplete="username"
              placeholder="john_doe"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900
              focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20
              dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email address
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              required
              autoComplete="email"
              placeholder="user@college.edu"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900
              focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20
              dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900
              focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20
              dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={updateField}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900
              focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20
              dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="USER">User</option>
              <option value="SECURITY">Security</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="PRINCIPAL">Principal</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Note: Admin roles cannot be assigned via user management for
              security.
            </p>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white
            shadow-md hover:bg-indigo-700 active:bg-indigo-800
            focus:outline-none focus:ring-2 focus:ring-indigo-600/30
            disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Creating user..." : "Create User"}
          </button>
        </form>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 text-center">
          <Link
            to="/admin"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
