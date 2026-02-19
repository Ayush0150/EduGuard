/**
 * StudentLoginPage
 * ----------------
 * Enterprise-grade student authentication page
 * for EduGuard Smart College Monitoring System.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import collegeImg from "../../../assets/college-img.png";

import { decodeJwt } from "../../../core/auth/jwt";
import {
  getAuthSession,
  setAuthSession,
} from "../../../core/auth/tokenStorage";

import { toast } from "../../../core/utils/toastEmitter";
import { validateIdentifier } from "../../../core/utils/validation";
import { login } from "../api/authApi";

import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/FormInput";
import { PasswordInput } from "../components/PasswordInput";
import { SubmitButton } from "../components/SubmitButton";

export default function StudentLoginPage() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /* ---------------------------------------------------
     Derived state
  --------------------------------------------------- */

  const canSubmit = useMemo(
    () => identifier.trim() !== "" && password.trim() !== "",
    [identifier, password]
  );

  /* ---------------------------------------------------
     Auto redirect if already logged in
  --------------------------------------------------- */

  useEffect(() => {
    const { token, user, isValid } = getAuthSession();
    if (!token || !isValid) return;

    const role = user?.role ?? decodeJwt(token)?.role;

    navigate(
      role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/dashboard",
      { replace: true }
    );
  }, [navigate]);

  /* ---------------------------------------------------
     Submit handler
  --------------------------------------------------- */

  async function onSubmit(e) {
    e.preventDefault();

    setFieldErrors({});

    const errors = {};

    const identifierCheck = validateIdentifier(identifier);

    if (!identifierCheck.valid) {
      errors.identifier = identifierCheck.error;
    }

    if (!password.trim()) {
      errors.password = "Please enter your password";
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);

      const message = errors.identifier || errors.password || "Invalid input";

      toast(message, "error");
      return;
    }

    setBusy(true);

    try {
      const data = await login({
        identifier: identifierCheck.value,
        password,
        remember,
      });

      setAuthSession({
        token: data.token,
        user: data.user,
        remember,
      });

      toast("Signed in successfully", "success");

      const role = data.user?.role ?? decodeJwt(data.token)?.role;

      navigate(
        role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/dashboard",
        { replace: true }
      );
    } catch (err) {
      const message =
        err?.response?.data?.message || "Unable to sign in. Please try again.";

      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------
     Render
  --------------------------------------------------- */

  return (
    <AuthLayout
      title="Student sign in"
      subtitle="Enter your student credentials to continue."
      backgroundImage={collegeImg}
      backgroundAlt="College campus"
      logoLink="/login/student"
    >
      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        {/* Identifier */}
        <FormInput
          id="identifier"
          label="Email or username"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (fieldErrors.identifier) {
              setFieldErrors((p) => ({ ...p, identifier: "" }));
            }
          }}
          placeholder="student@college.edu"
          error={fieldErrors.identifier}
          required
          autoComplete="username"
        />

        {/* Password */}
        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) {
              setFieldErrors((p) => ({ ...p, password: "" }));
            }
          }}
          placeholder="••••••••"
          error={fieldErrors.password}
          required
        />

        {/* Options */}
        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="group flex cursor-pointer items-center gap-2.5 text-sm text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-white">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4.5 w-4.5 rounded-none border-surface-300 bg-surface-50 text-brand-600 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-950"
            />
            <span className="select-none">Remember this device</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <SubmitButton disabled={!canSubmit || busy} busy={busy}>
          Sign in
        </SubmitButton>

        {/* Footer link */}
        <div className="pt-4 text-center">
          <Link
            to="/login"
            className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
