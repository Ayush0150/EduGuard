/**
 * AdminLoginOtpPage
 * -----------------
 * Admin OTP verification for secure login.
 * Features: 6-digit OTP input, countdown timer, resend functionality.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import adminImg from "../../../assets/admin-img.png";

import { decodeJwt } from "../../../core/auth/jwt";
import {
  getAuthSession,
  setAuthSession,
} from "../../../core/auth/tokenStorage";

import { toast } from "../../../core/utils/toastEmitter";

import { resendAdminLoginOtp, verifyAdminLoginOtp } from "../api/authApi";

import { AuthLayout } from "../components/AuthLayout";
import { OtpInput } from "../components/OtpInput";
import { OtpTimer } from "../components/OtpTimer";
import { SubmitButton } from "../components/SubmitButton";

export default function AdminLoginOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [otp, setOtp] = useState("");
  const [adminId, setAdminId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [emailMasked, setEmailMasked] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [timerKey, setTimerKey] = useState(0); // Key to reset timer component

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
     Load navigation state
  --------------------------------------------------- */

  useEffect(() => {
    const stateIdentifier = location.state?.identifier;
    const statePassword = location.state?.password;
    const stateAdminId = location.state?.adminId;
    const stateRemember = location.state?.remember;
    const stateEmailMasked = location.state?.emailMasked;

    if (!stateIdentifier || !stateAdminId) {
      toast("Please sign in again to verify your admin access.", "error");
      navigate("/login/admin", { replace: true });
      return;
    }

    setIdentifier(stateIdentifier);
    setPassword(statePassword ?? "");
    setAdminId(stateAdminId);
    setRemember(typeof stateRemember === "boolean" ? stateRemember : true);
    setEmailMasked(stateEmailMasked ?? "");
  }, [location.state, navigate]);

  /* ---------------------------------------------------
     Resend OTP handler
  --------------------------------------------------- */

  const handleResendOtp = useCallback(async () => {
    if (!adminId) {
      toast("Please sign in again to request a new code.", "error");
      navigate("/login/admin", { replace: true });
      return;
    }

    setResendBusy(true);

    try {
      await resendAdminLoginOtp({ adminId });

      setOtp("");
      setTimerKey((prev) => prev + 1);

      toast("A new verification code has been sent.", "success");
    } catch (err) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        "Failed to send a new code. Please try again.";

      // If session expired or admin not found, redirect to login
      if (status === 401 || status === 404) {
        toast("Session expired. Please sign in again.", "error");
        navigate("/login/admin", { replace: true });
        return;
      }

      toast(message, "error");
    } finally {
      setResendBusy(false);
    }
  }, [adminId, navigate]);

  /* ---------------------------------------------------
     Submit handler
  --------------------------------------------------- */

  async function handleVerifyOtp(e) {
    e.preventDefault();

    if (!adminId) {
      toast("Please sign in again to verify your admin access.", "error");
      navigate("/login/admin", { replace: true });
      return;
    }

    // Validate OTP length
    if (otp.length !== 6) {
      toast("Please enter the complete 6-digit code.", "error");
      return;
    }

    setBusy(true);

    try {
      const data = await verifyAdminLoginOtp({
        adminId,
        otp,
      });

      setAuthSession({
        token: data.token,
        user: data.user,
        remember,
      });

      toast("Admin access verified.", "success");

      navigate("/admin", { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "The verification code is invalid or expired.";

      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------
     Render
  --------------------------------------------------- */

  const subtitle = emailMasked
    ? `Enter the 6-digit OTP sent to ${emailMasked}.`
    : "Enter the 6-digit OTP sent to your registered email.";

  return (
    <AuthLayout
      title="Verify OTP"
      subtitle={subtitle}
      backgroundImage={adminImg}
      backgroundAlt="Administrative security interface"
      logoLink="/login/admin"
    >
      <div className="space-y-6">
        <form onSubmit={handleVerifyOtp} className="space-y-6" noValidate>
          {/* OTP Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Verification code
            </label>
            <OtpInput value={otp} onChange={setOtp} disabled={busy} autoFocus />
          </div>

          {/* Countdown Timer & Resend */}
          <OtpTimer
            key={timerKey}
            expirySeconds={300}
            resendCooldown={30}
            canResend={!!adminId}
            resendBusy={resendBusy}
            onResend={handleResendOtp}
          />

          <SubmitButton disabled={busy || otp.length !== 6} busy={busy}>
            Verify admin login
          </SubmitButton>
        </form>

        <div className="pt-4 text-center">
          <Link
            to="/login/admin"
            className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Back to admin sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
