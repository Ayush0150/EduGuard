import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminImg from "../../../assets/admin-img.jpg";
import { decodeJwt } from "../../../core/auth/jwt";
import {
  getAuthSession,
  setAuthSession,
} from "../../../core/auth/tokenStorage";
import { adminLogin } from "../api/authApi";
import { AlertMessage } from "../components/AlertMessage";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const canSubmit = useMemo(() => {
    return identifier.trim() && password;
  }, [identifier, password]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
    setError("");
    setFieldErrors({});

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setFieldErrors({ identifier: "Email or username is required." });
      return;
    }
    if (!password) {
      setFieldErrors({ password: "Password is required." });
      return;
    }

    setBusy(true);
    try {
      const payload = { identifier: trimmedIdentifier, password, remember };
      const data = await adminLogin(payload);

      // Store session with user data
      setAuthSession({ token: data.token, user: data.user, remember });

      setError("");
      setFieldErrors({});
      setSuccess("Login successful! Redirecting...");

      // Use window.location for clean navigation (prevents state issues)
      setTimeout(() => {
        window.location.replace("/admin");
      }, 500);
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length) {
        const nextFieldErrors = {};
        for (const item of serverErrors) {
          const key = Array.isArray(item?.path) ? item.path[0] : item?.path;
          if (typeof key === "string" && !nextFieldErrors[key]) {
            nextFieldErrors[key] = item?.message;
          }
        }
        if (Object.keys(nextFieldErrors).length)
          setFieldErrors(nextFieldErrors);
      }

      const firstFieldError = serverErrors?.[0]?.message;
      const message =
        firstFieldError || err?.response?.data?.message || "Login failed";
      setError(message);
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
            if (error) setError("");
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
            if (error) setError("");
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

        <AlertMessage type="error" message={error} />
        <AlertMessage type="success" message={success} />

        <SubmitButton disabled={!canSubmit} busy={busy}>
          Log In
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
