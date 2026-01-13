import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import adminImg from "../../../assets/admin-img.jpg";
import collegeImg from "../../../assets/college-img.png";
import {
  requestAdminResetOtp,
  requestResetOtp,
  resetAdminPassword,
  resetPassword,
  verifyAdminResetOtp,
  verifyResetOtp,
} from "../api/authApi";
import { AlertMessage } from "../components/AlertMessage";
import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/FormInput";
import { PasswordInput } from "../components/PasswordInput";
import { SubmitButton } from "../components/SubmitButton";

export default function ForgotPasswordPage() {
  const location = useLocation();
  const isAdminRoute = location.pathname.includes("/admin");
  const backgroundImg = isAdminRoute ? adminImg : collegeImg;

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const emailOk = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  const passwordRules = useMemo(() => {
    const pwd = newPassword;
    return {
      min: pwd.length >= 8,
      lower: /[a-z]/.test(pwd),
      upper: /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      symbol: /[^A-Za-z0-9]/.test(pwd),
    };
  }, [newPassword]);

  const passwordStrong = useMemo(
    () => Object.values(passwordRules).every(Boolean),
    [passwordRules]
  );

  const canRequest = useMemo(() => emailOk, [emailOk]);
  const canVerify = useMemo(() => /^\d{6}$/.test(otp.trim()), [otp]);
  const canReset = useMemo(() => {
    if (!resetToken) return false;
    if (!passwordStrong) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  }, [resetToken, passwordStrong, newPassword, confirmPassword]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (info) {
      const timer = setTimeout(() => setInfo(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [info]);

  function applyServerFieldErrors(err) {
    const serverErrors = err?.response?.data?.errors;
    if (!Array.isArray(serverErrors) || !serverErrors.length) return false;

    const nextFieldErrors = {};
    for (const item of serverErrors) {
      const key = Array.isArray(item?.path) ? item.path[0] : item?.path;
      if (typeof key === "string" && !nextFieldErrors[key]) {
        nextFieldErrors[key] = item?.message;
      }
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return true;
    }

    return false;
  }

  async function onRequestOtp(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setFieldErrors({});

    if (!emailOk) {
      setFieldErrors({ email: "Enter a valid email." });
      return;
    }

    setBusy(true);
    try {
      const trimmedEmail = email.trim();

      if (isAdminRoute) {
        await requestAdminResetOtp(trimmedEmail);
        setInfo(
          "A one-time password (OTP) has been sent to your email. Please check your inbox and spam folder."
        );
      } else {
        await requestResetOtp(trimmedEmail);
        setInfo(
          "If this email is registered, a one-time password (OTP) has been sent. Please check your inbox and spam folder."
        );
      }
      setStep(2);
    } catch (err) {
      const mapped = applyServerFieldErrors(err);
      if (!mapped) {
        const firstFieldError = err?.response?.data?.errors?.[0]?.message;
        setError(
          firstFieldError ||
            err?.response?.data?.message ||
            "Unable to send OTP. Please check your email address and try again."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setFieldErrors({});

    if (!emailOk) {
      setFieldErrors({ email: "Enter a valid email." });
      return;
    }
    if (!canVerify) {
      setFieldErrors({ otp: "OTP must be 6 digits." });
      return;
    }

    setBusy(true);
    try {
      const payload = { email: email.trim(), otp: otp.trim() };
      const data = isAdminRoute
        ? await verifyAdminResetOtp(payload)
        : await verifyResetOtp(payload);
      setResetToken(data.resetToken);
      setStep(3);
    } catch (err) {
      const mapped = applyServerFieldErrors(err);
      if (!mapped) {
        const firstFieldError = err?.response?.data?.errors?.[0]?.message;
        setError(
          firstFieldError ||
            err?.response?.data?.message ||
            "The OTP you entered is invalid or has expired. Please request a new one."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setFieldErrors({});

    if (!emailOk) {
      setFieldErrors({ email: "Enter a valid email." });
      return;
    }
    if (!resetToken) {
      setError("Reset token is missing. Please verify OTP again.");
      return;
    }
    if (!passwordRules.min) {
      setFieldErrors({
        newPassword: "Password must be at least 8 characters long.",
      });
      return;
    }
    if (!passwordRules.lower) {
      setFieldErrors({
        newPassword:
          "Password must include at least one lowercase letter (a-z).",
      });
      return;
    }
    if (!passwordRules.upper) {
      setFieldErrors({
        newPassword:
          "Password must include at least one uppercase letter (A-Z).",
      });
      return;
    }
    if (!passwordRules.number) {
      setFieldErrors({
        newPassword: "Password must include at least one number (0-9).",
      });
      return;
    }
    if (!passwordRules.symbol) {
      setFieldErrors({
        newPassword:
          "Password must include at least one special character (!@#$%^&*).",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({
        confirmPassword:
          "The passwords you entered do not match. Please try again.",
      });
      return;
    }

    setBusy(true);
    try {
      const payload = { email: email.trim(), resetToken, newPassword };
      if (isAdminRoute) {
        await resetAdminPassword(payload);
      } else {
        await resetPassword(payload);
      }
      setInfo(
        "Your password has been reset successfully! You can now log in with your new password."
      );
      setStep(4);
    } catch (err) {
      const mapped = applyServerFieldErrors(err);
      if (!mapped) {
        const firstFieldError = err?.response?.data?.errors?.[0]?.message;
        setError(
          firstFieldError ||
            err?.response?.data?.message ||
            "Unable to reset password. Please try again or request a new OTP."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const visualStep = step === 4 ? 3 : step;
  const steps = [
    { id: 1, label: "Email" },
    { id: 2, label: "OTP" },
    { id: 3, label: "New password" },
  ];

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Reset using an email OTP."
      backgroundImage={backgroundImg}
      backgroundAlt={isAdminRoute ? "Admin Background" : "College campus"}
    >
      <div className="space-y-6">
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
          aria-label="Reset steps"
        >
          {steps.map((s, idx) => {
            const done = visualStep > s.id;
            const current = visualStep === s.id;
            const circleClass =
              done || current
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400";
            const labelClass =
              done || current
                ? "text-slate-700 dark:text-slate-200"
                : "text-slate-500 dark:text-slate-400";
            const connectorClass =
              visualStep > s.id
                ? "bg-indigo-200 dark:bg-indigo-900/40"
                : "bg-slate-200 dark:bg-slate-800";

            return (
              <div key={s.id} className="flex items-center sm:flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-none border text-[11px] font-semibold ${circleClass}`}
                    aria-current={current ? "step" : undefined}
                  >
                    {s.id}
                  </div>
                  <span className={`text-xs font-semibold ${labelClass}`}>
                    {s.label}
                  </span>
                </div>

                {idx !== steps.length - 1 && (
                  <div
                    className={`mx-3 hidden h-px flex-1 sm:block ${connectorClass}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {step === 4 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              ✓ Password Reset Complete
            </p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-300">
              Your password has been successfully updated. You can now log in
              with your new credentials.
            </p>
          </div>
        )}

        <AlertMessage type="error" message={error} />
        <AlertMessage type="info" message={info} />

        {step === 1 && (
          <form className="space-y-4" onSubmit={onRequestOtp}>
            <FormInput
              id="email"
              label="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
                if (fieldErrors.email)
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="Enter your registered email"
              error={fieldErrors.email}
              autoComplete="email"
            />
            <SubmitButton disabled={!canRequest} busy={busy}>
              Send OTP
            </SubmitButton>
            <Link
              to={isAdminRoute ? "/login/admin" : "/login"}
              className="block text-center text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Back to login
            </Link>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4" onSubmit={onVerifyOtp}>
            <FormInput
              id="otp"
              label="OTP"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                if (error) setError("");
                if (fieldErrors.otp)
                  setFieldErrors((prev) => ({ ...prev, otp: "" }));
              }}
              placeholder="Enter 6-digit OTP"
              error={fieldErrors.otp}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              helpText="Please enter the 6-digit code sent to your email. The code expires in 10 minutes."
            />
            <SubmitButton disabled={!canVerify} busy={busy}>
              Verify OTP
            </SubmitButton>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full rounded-none border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:focus-visible:ring-offset-slate-900"
            >
              Change email
            </button>
          </form>
        )}

        {step === 3 && (
          <form className="space-y-4" onSubmit={onReset}>
            <PasswordInput
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError("");
                if (fieldErrors.newPassword)
                  setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
              }}
              placeholder="Use a strong password"
              error={fieldErrors.newPassword}
              autoComplete="new-password"
              helpText="Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters."
            />
            <PasswordInput
              id="confirmPassword"
              label="Confirm password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError("");
                if (fieldErrors.confirmPassword)
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: "",
                  }));
              }}
              placeholder="Re-enter new password"
              error={
                fieldErrors.confirmPassword ||
                (confirmPassword &&
                  confirmPassword !== newPassword &&
                  "Passwords do not match.")
              }
              autoComplete="new-password"
            />
            <SubmitButton disabled={!canReset} busy={busy}>
              Reset password
            </SubmitButton>
          </form>
        )}

        {step === 4 && (
          <Link
            to={isAdminRoute ? "/login/admin" : "/login"}
            className="inline-flex w-full items-center justify-center rounded-none bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          >
            Go to login
          </Link>
        )}
      </div>
    </AuthLayout>
  );
}
