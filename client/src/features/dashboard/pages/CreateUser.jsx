/**
 * CreateUser
 * ----------
 * Enterprise-grade staff onboarding screen
 * for EduGuard administration panel.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AnimatedPage from "../../../core/components/AnimatedPage";

import { toast } from "../../../core/utils/toastEmitter";
import {
  validateEmail,
  validatePassword,
  validateRole,
  validateUsername,
} from "../../../core/utils/validation";

import { FormInput } from "../../auth/components/FormInput";
import { PasswordInput } from "../../auth/components/PasswordInput";
import { SubmitButton } from "../../auth/components/SubmitButton";

import { createUser } from "../services/adminUserApi";

export default function CreateUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER",
  });

  const [loading, setLoading] = useState(false);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();

    const emailV = validateEmail(form.email);
    const userV = validateUsername(form.username);
    const passV = validatePassword(form.password);
    const roleV = validateRole(form.role);

    if (!emailV.valid || !userV.valid || !passV.valid || !roleV.valid) {
      return toast(
        "Please review the information and correct the highlighted fields.",
        "error"
      );
    }

    setLoading(true);

    try {
      await createUser({
        email: emailV.value,
        username: userV.value,
        password: passV.value,
        role: roleV.value,
        isActive: true,
      });

      toast("Staff member successfully onboarded.", "success");
      navigate("/admin", { replace: true });
    } catch (err) {
      toast(
        err?.response?.data?.message ||
          "Unable to complete onboarding. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatedPage className="mx-auto max-w-3xl py-6">
      <Link
        to="/admin"
        className="group mb-8 inline-flex items-center gap-2 text-sm font-semibold text-surface-500 transition-colors hover:text-brand-600"
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
          <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white">
            Create user
          </h1>
          <p className="mt-2 max-w-xl text-sm text-surface-500">
            Add a new account and assign a role.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-8 p-8">
          <div className="grid gap-8 md:grid-cols-2">
            <FormInput
              id="username"
              name="username"
              label="Username"
              value={form.username}
              onChange={updateField}
              placeholder="username"
              required
            />

            <FormInput
              id="email"
              name="email"
              type="email"
              label="Email address"
              value={form.email}
              onChange={updateField}
              placeholder="name@college.edu"
              required
            />

            <PasswordInput
              id="password"
              name="password"
              label="Password"
              value={form.password}
              onChange={updateField}
              required
            />

            <div className="space-y-2">
              <label
                htmlFor="role"
                className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2"
              >
                Role
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={updateField}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-4 text-base text-surface-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-surface-800 dark:bg-surface-950/50 dark:text-white"
                required
              >
                <option value="USER">Standard user</option>
                <option value="SECURITY">Security officer</option>
                <option value="MAINTENANCE">Maintenance staff</option>
                <option value="PRINCIPAL">Principal / authority</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6 sm:flex-row">
            <SubmitButton busy={loading} className="sm:flex-1">
              Create user
            </SubmitButton>

            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-surface-200 px-8 py-4 text-base font-semibold text-surface-600 transition-all hover:bg-surface-50 dark:border-surface-800 dark:text-surface-400 dark:hover:bg-surface-800/50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AnimatedPage>
  );
}
