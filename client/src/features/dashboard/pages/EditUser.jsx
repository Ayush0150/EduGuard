import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "../../../core/utils/toastEmitter";
import {
  validateEmail,
  validatePassword,
  validateRole,
  validateUsername,
} from "../../../core/utils/validation";
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
    } catch (err) {
      toast.error("Unable to load user details. Please try again.");
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
    setSaving(true);

    // Client-side validation
    const emailValidation = validateEmail(form.email);
    const usernameValidation = validateUsername(form.username);
    const roleValidation = validateRole(form.role);

    const errors = {};
    if (!emailValidation.valid) errors.email = emailValidation.error;
    if (!usernameValidation.valid) errors.username = usernameValidation.error;
    if (!roleValidation.valid) errors.role = roleValidation.error;

    // Only validate password if provided
    if (form.password) {
      const passwordValidation = validatePassword(form.password);
      if (!passwordValidation.valid) errors.password = passwordValidation.error;
    }

    if (Object.keys(errors).length > 0) {
      toast.error(
        "Please check the form and correct any errors before submitting."
      );
      setSaving(false);
      return;
    }

    try {
      const payload = {
        username: usernameValidation.value,
        email: emailValidation.value,
        role: roleValidation.value,
      };

      // Only include password if it's being changed
      if (form.password) {
        const passwordValidation = validatePassword(form.password);
        if (passwordValidation.valid) {
          payload.password = passwordValidation.value;
        }
      }

      await updateUser(id, payload);
      toast.success("User updated successfully!");
      navigate("/admin");
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to update user";
      toast.error(message);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Compact Header */}
        <div className="mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-3"
          >
            <svg
              className="w-4 h-4 mr-1"
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Edit User
          </h1>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          {/* Admin Warning Banner */}
          {isAdminUser && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0"
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
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">Administrator Account</span> -
                  This user has {originalRole} privileges. Admin roles cannot be
                  modified.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="p-6 space-y-6">
            {/* Username and Email - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  name="username"
                  value={form.username}
                  onChange={updateField}
                  required
                  autoComplete="username"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  transition-colors"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  transition-colors"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            {/* Password and Role - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password{" "}
                  <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={updateField}
                  autoComplete="new-password"
                  placeholder="Leave empty to keep current"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Role
                </label>
                {isAdminUser ? (
                  <input
                    type="text"
                    value={originalRole}
                    disabled
                    className="w-full px-3 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700
                    bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-sm font-medium
                    cursor-not-allowed"
                  />
                ) : (
                  <select
                    name="role"
                    value={form.role}
                    onChange={updateField}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
                    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    transition-colors cursor-pointer"
                  >
                    <option value="USER">User</option>
                    <option value="SECURITY">Security</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="PRINCIPAL">Principal</option>
                  </select>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg
                font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <Link
                to="/admin"
                className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700
                rounded-lg font-medium transition-colors"
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
