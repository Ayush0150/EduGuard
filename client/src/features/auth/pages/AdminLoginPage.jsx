/**
 * AdminLoginPage
 * --------------
 * Secure administrative authentication interface
 * for the EduGuard control panel.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import adminImg from "../../../assets/admin-img.png";

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

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const canSubmit = useMemo(
    () => identifier.trim().length > 0 && password.length > 0,
    [identifier, password]
  );

  /* ---------------------------------------------------
     Auto-redirect if already authenticated
  --------------------------------------------------- */

  useEffect(() => {
    const { token, user, isValid } = getAuthSession();
    if (!token || !isValid) return;

    const role = user?.role ?? decodeJwt(token)?.role;

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  /* ---------------------------------------------------
     Submit handler
  --------------------------------------------------- */

  async function onSubmit(e) {
    e.preventDefault();
    setFieldErrors({});

    const identifierCheck = validateIdentifier(identifier);

    const errors = {};
    if (!identifierCheck.valid) errors.identifier = identifierCheck.error;

    if (!password.trim()) errors.password = "Password is required";

    if (Object.keys(errors).length > 0) {
      const message = errors.identifier || errors.password || "Invalid input";

      setFieldErrors(errors);
      toast(message, "error");
      return;
    }

    setBusy(true);

    try {
      const data = await login(
        {
          identifier: identifierCheck.value,
          password,
          remember,
        },
        { admin: true }
      );

      if (data?.otpRequired) {
        toast("Verification code sent to your admin email.", "success");

        navigate("/admin/login/verify-otp", {
          replace: true,
          state: {
            identifier: identifierCheck.value,
            password, // Pass password for resend functionality
            adminId: data.adminId,
            remember,
            emailMasked: data.emailMasked,
          },
        });

        return;
      }

      setAuthSession({
        token: data.token,
        user: data.user,
        remember,
      });

      toast("Administrator access granted.", "success");

      navigate("/admin", { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Authentication failed. Please verify your credentials.";

      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */

  return (
    <AuthLayout
      title="Admin sign in"
      subtitle="Enter your admin credentials to continue."
      backgroundImage={adminImg}
      backgroundAlt="Administrative security interface"
      logoLink="/login/admin"
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
          placeholder="admin@eduguard.com"
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
            to="/admin/forgot-password"
            className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <SubmitButton disabled={!canSubmit || busy} busy={busy}>
          Sign in
        </SubmitButton>

        {/* Admin link */}
        <div className="pt-4 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
