import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getUserById, updateUser } from "../services/adminUserApi";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const REGULAR_ROLES = ["USER", "SECURITY", "MAINTENANCE", "PRINCIPAL"];

export default function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    role: "USER",
    password: "",
  });
  const [originalRole, setOriginalRole] = useState("");
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getUserById(id);
      const userIsAdmin = ADMIN_ROLES.includes(user.role);

      setOriginalRole(user.role || "USER");
      setIsAdminUser(userIsAdmin);
      setForm({
        username: user.username || "",
        email: user.email || "",
        role: userIsAdmin ? "USER" : user.role || "USER",
        password: "", // Never pre-fill password
      });
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = {
        username: form.username,
        email: form.email,
        role: form.role,
      };

      // Only include password if it's being changed
      if (form.password) {
        payload.password = form.password;
      }

      await updateUser(id, payload);
      navigate("/admin");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Loading user details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 px-4 sm:px-6 py-8">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header with gradient */}
          <div className="relative px-6 sm:px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
            <div className="relative">
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit User
              </h1>
              <p className="mt-2 text-indigo-100">
                Update user details, role, and permissions
              </p>
            </div>
          </div>

          {/* Admin User Warning Banner */}
          {isAdminUser && (
            <div className="mx-6 sm:mx-8 mt-6 rounded-xl border-2 border-amber-300 dark:border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Administrator Account
                  </h3>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    This user has{" "}
                    <span className="font-bold">{originalRole}</span>{" "}
                    privileges. Admin roles cannot be modified through this
                    interface for security reasons. You can only update
                    username, email, and password.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={onSubmit}
            className="px-6 sm:px-8 py-6 sm:py-8 space-y-5"
          >
            {error && (
              <div className="rounded-xl border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
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
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    name="username"
                    value={form.username}
                    onChange={updateField}
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
                  focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20
                  transition-all duration-200 placeholder:text-slate-400"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateField}
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
                  focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20
                  transition-all duration-200 placeholder:text-slate-400"
                    placeholder="user@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Password (optional) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                New Password{" "}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-slate-400"
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
                </div>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={updateField}
                  autoComplete="new-password"
                  placeholder="Leave empty to keep current password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600
                bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
                focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20
                transition-all duration-200 placeholder:text-slate-400"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Only fill this field if you want to change the password
              </p>
            </div>

            {/* Role - Show as disabled for admin users */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Role
              </label>
              {isAdminUser ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-amber-500"
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
                  </div>
                  <input
                    type="text"
                    value={originalRole}
                    disabled
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-amber-200 dark:border-amber-700
                  bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-sm font-medium
                  cursor-not-allowed"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <select
                    name="role"
                    value={form.role}
                    onChange={updateField}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
                  focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20
                  transition-all duration-200 appearance-none cursor-pointer"
                  >
                    <option value="USER">👤 User - Basic access</option>
                    <option value="SECURITY">
                      🛡️ Security - Security personnel
                    </option>
                    <option value="MAINTENANCE">
                      🔧 Maintenance - Maintenance staff
                    </option>
                    <option value="PRINCIPAL">
                      👔 Principal - School administrator
                    </option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              )}
              {!isAdminUser && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Admin roles (ADMIN, SUPER_ADMIN) cannot be assigned here for
                  security
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 group relative rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
              hover:from-indigo-700 hover:to-purple-700 py-3.5 px-6 text-sm font-semibold text-white
              shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40
              focus:outline-none focus:ring-4 focus:ring-indigo-500/50
              disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none
              transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex items-center justify-center gap-2">
                  {saving ? (
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
                      Saving Changes...
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Save Changes
                    </>
                  )}
                </span>
              </button>
              <Link
                to="/admin"
                className="flex-1 sm:flex-none rounded-xl border-2 border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-800 py-3.5 px-6 text-sm font-semibold
              text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700
              focus:outline-none focus:ring-4 focus:ring-slate-300/50 dark:focus:ring-slate-600/50
              transition-all duration-200 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Footer with helpful info */}
          <div className="px-6 sm:px-8 py-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
              <svg
                className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5"
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
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Security Note
                </p>
                <p className="mt-1">
                  All changes are logged. Passwords are encrypted using bcrypt.
                  Admin privileges require direct database access to modify.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
