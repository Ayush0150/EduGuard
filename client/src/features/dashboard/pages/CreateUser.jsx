import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "../../../core/utils/toastEmitter";
import {
  validateEmail,
  validatePassword,
  validateRole,
  validateUsername,
} from "../../../core/utils/validation";
import { createUser } from "../services/adminUserApi";

export default function CreateUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    role: "USER",
  });

  const [loading, setLoading] = useState(false);

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
    const emailValidation = validateEmail(form.email);
    const usernameValidation = validateUsername(form.username);
    const passwordValidation = validatePassword(form.password);
    const roleValidation = validateRole(form.role);

    const errors = {};
    if (!emailValidation.valid) errors.email = emailValidation.error;
    if (!usernameValidation.valid) errors.username = usernameValidation.error;
    if (!passwordValidation.valid) errors.password = passwordValidation.error;
    if (!roleValidation.valid) errors.role = roleValidation.error;

    if (Object.keys(errors).length > 0) {
      // Show validation error
      toast.error(
        "Unable to create user. Please check the form and try again."
      );
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: emailValidation.value,
        username: usernameValidation.value,
        password: passwordValidation.value,
        role: roleValidation.value,
        isActive: true,
      };

      await createUser(payload);
      toast.success("User created successfully!");
      navigate("/admin");
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to create user";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Back Link */}
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Link>

        {/* Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 py-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
                <svg
                  className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Create New User
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Add a new user account and assign appropriate role
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="px-6 sm:px-8 py-6">
            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Username
                </label>
                <input
                  name="username"
                  value={form.username}
                  onChange={updateField}
                  required
                  autoComplete="username"
                  placeholder="john_doe"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  placeholder:text-slate-400 transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  required
                  autoComplete="email"
                  placeholder="user@college.edu"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  placeholder:text-slate-400 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  placeholder:text-slate-400 transition-colors"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Minimum 8 characters recommended
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={updateField}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  transition-colors cursor-pointer"
                >
                  <option value="USER">User</option>
                  <option value="SECURITY">Security</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="PRINCIPAL">Principal</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Admin roles require database access
                </p>
              </div>
            </div>

            {/* Info Banner */}
            <div className="mt-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3 border border-indigo-200 dark:border-indigo-500/30">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
                    Security Notice
                  </p>
                  <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-400">
                    New users will be created with active status. Passwords are
                    securely encrypted using bcrypt.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg
                font-semibold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </button>
              <Link
                to="/admin"
                className="px-6 py-3 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700
                text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
