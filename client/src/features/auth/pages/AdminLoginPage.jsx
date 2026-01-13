import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminImg from "../../../assets/admin-img.jpg";
import { decodeJwt } from "../../../core/auth/jwt";
import {
  getAuthSession,
  setAuthSession,
} from "../../../core/auth/tokenStorage";
import { toast } from "../../../core/utils/toastEmitter";
import { validateIdentifier } from "../../../core/utils/validation";
import { adminLogin } from "../api/authApi";
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

  useEffect(() => {
    const { token, user, isValid } = getAuthSession();

    // If already logged in with valid session, redirect based on role
    if (token && isValid) {
      const role = user?.role ?? decodeJwt(token)?.role;
      const next =
        role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      navigate(next, { replace: true });
    }
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validation - only check if fields are provided
    const identifierValidation = validateIdentifier(identifier);

    const errors = {};
    if (!identifierValidation.valid) {
      errors.identifier = identifierValidation.error;
    }
    if (!password || password.trim().length === 0) {
      errors.password = "Please enter your password";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setBusy(true);
    try {
      const payload = {
        identifier: identifierValidation.value,
        password: password,
        remember,
      };
      const data = await adminLogin(payload);

      setAuthSession({ token: data.token, user: data.user, remember });
      setFieldErrors({});
      toast.success("Welcome! Redirecting to admin panel...");

      setTimeout(() => {
        window.location.replace("/admin");
      }, 500);
    } catch {
      // Don't show field-level errors for login to prevent user enumeration
      // Show generic error message only
      setFieldErrors({});

      // Always show same message for security - don't reveal if user exists
      toast.error(
        "Invalid email or password. Please check your credentials and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Admin Panel"
      subtitle="Administrative access portal"
      backgroundImage={adminImg}
      backgroundAlt="Admin Login Background"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <FormInput
          id="identifier"
          label="Email or Username"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (fieldErrors.identifier)
              setFieldErrors((prev) => ({ ...prev, identifier: "" }));
          }}
          placeholder="Enter your email or username"
          error={fieldErrors.identifier}
          required
          autoComplete="username"
        />

        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password)
              setFieldErrors((prev) => ({ ...prev, password: "" }));
          }}
          placeholder="Enter password"
          error={fieldErrors.password}
          required
        />

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded-none border-slate-300 accent-indigo-600 focus:ring-indigo-600 dark:border-slate-600"
            />
            Remember me
          </label>

          <Link
            to="/admin/forgot-password"
            className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Forgot your password?
          </Link>
        </div>

        <SubmitButton disabled={!canSubmit} busy={busy}>
          Log In
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
