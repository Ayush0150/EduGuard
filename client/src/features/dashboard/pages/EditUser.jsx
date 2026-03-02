import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AnimatedPage from "../../../core/components/AnimatedPage";
import { toast } from "../../../core/utils/toastEmitter";
import {
  validateEmail,
  validateRole,
  validateUsername,
} from "../../../core/utils/validation";
import { FormInput } from "../../auth/components/FormInput";
import { SubmitButton } from "../../auth/components/SubmitButton";
import { getUserById, updateUser } from "../services/adminUserApi";

export default function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    username: "",
    role: "USER",
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------
     Load user
  --------------------------------------------------- */

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getUserById(id);

        setForm({
          email: data.email || "",
          username: data.username || "",
          role: data.role || "USER",
          isActive: Boolean(data.isActive),
        });
      } catch {
        toast.error("Failed to load user details.");
        navigate("/admin", { replace: true });
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [id, navigate]);

  /* ---------------------------------------------------
     Handlers
  --------------------------------------------------- */

  function updateField(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();

    const emailValidation = validateEmail(form.email);
    const usernameValidation = validateUsername(form.username);
    const roleValidation = validateRole(form.role);

    if (
      !emailValidation.valid ||
      !usernameValidation.valid ||
      !roleValidation.valid
    ) {
      toast.error("Please correct the form errors before saving.");
      return;
    }

    setSaving(true);
    try {
      await updateUser(id, {
        email: emailValidation.value,
        username: usernameValidation.value,
        role: roleValidation.value,
        isActive: form.isActive,
      });

      toast.success("User updated successfully.");
      navigate("/admin");
    } catch {
      toast.error("Failed to update user. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------
     Render
  --------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-surface-600 dark:text-surface-400">
            Loading user...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage className="mx-auto max-w-3xl py-4">
      <Link
        to="/admin"
        className="group mb-8 inline-flex items-center gap-2 text-sm font-bold text-surface-500 hover:text-brand-600 transition-colors"
      >
        <svg
          className="h-4 w-4 transition-transform group-hover:-translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back
      </Link>

      <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-soft dark:border-surface-800 dark:bg-surface-900">
        <header className="border-b border-surface-100 p-8 dark:border-surface-800">
          <h1 className="text-2xl font-black text-surface-900 dark:text-white">
            Edit user
          </h1>
        </header>

        <form onSubmit={onSubmit} className="p-8 space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <FormInput
              id="username"
              name="username"
              label="Username"
              value={form.username}
              onChange={updateField}
              required
            />

            <FormInput
              id="email"
              name="email"
              type="email"
              label="Email address"
              value={form.email}
              onChange={updateField}
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-bold text-surface-700 dark:text-surface-300">
                Role
              </label>
              <select
                name="role"
                value={form.role}
                onChange={updateField}
                className="mt-2 w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3.5 text-base text-surface-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-surface-800 dark:bg-surface-950/50 dark:text-white"
              >
                <option value="USER">Standard User</option>
                <option value="SECURITY">Security Officer</option>
                <option value="MAINTENANCE">Maintenance Crew</option>
                <option value="PRINCIPAL">Academic Principal</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-8">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={updateField}
                className="h-4.5 w-4.5 rounded border-surface-300 bg-surface-50 text-brand-600 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-950"
              />
              <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                Active
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6 sm:flex-row">
            <SubmitButton
              busy={saving}
              className="sm:flex-1"
              loadingText="Saving..."
            >
              Save Changes
            </SubmitButton>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-surface-200 px-8 py-4 text-base font-bold text-surface-600 transition-all hover:bg-surface-50 dark:border-surface-800 dark:text-surface-400 dark:hover:bg-surface-800/50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AnimatedPage>
  );
}
