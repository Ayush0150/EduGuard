/**
 * VerifyOtpPage
 * -------------
 * Enterprise-grade OTP verification screen
 * for EduGuard password recovery flow.
 */

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import adminImg from "../../../assets/admin-img.avif";
import collegeImg from "../../../assets/college-img.png";

import { toast } from "../../../core/utils/toastEmitter";
import { validateOTP } from "../../../core/utils/validation";
import { verifyResetOtp } from "../api/authApi";

import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/FormInput";
import { SubmitButton } from "../components/SubmitButton";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = location.pathname.includes("/admin");
  const backgroundImage = isAdmin ? adminImg : collegeImg;

  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  /* ---------------------------------------------------
     Load email from navigation state
  --------------------------------------------------- */

  useEffect(() => {
    const stateEmail = location.state?.email;

    if (!stateEmail) {
      toast("Please start the recovery process again.", "error");
      return;
    }

    setEmail(stateEmail);
  }, [location.state]);

  /* ---------------------------------------------------
     Submit handler
  --------------------------------------------------- */

  async function handleVerifyOtp(e) {
    e.preventDefault();

    if (!email) {
      const message = "Please restart the password recovery process.";
      toast(message, "error");
      return;
    }

    const otpCheck = validateOTP(otp);

    if (!otpCheck.valid) {
      toast(otpCheck.error, "error");
      return;
    }

    setBusy(true);

    try {
      const data = await verifyResetOtp(
        { email, otp: otpCheck.value },
        { admin: isAdmin }
      );

      toast("Verification successful", "success");

      navigate(isAdmin ? "/admin/reset-password" : "/reset-password", {
        replace: true,
        state: {
          email,
          resetToken: data.resetToken,
          admin: isAdmin,
        },
      });
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

  return (
    <AuthLayout
      title="Verify code"
      subtitle="Enter the 6-digit code sent to your email."
      backgroundImage={backgroundImage}
      logoLink={isAdmin ? "/login/admin" : "/login"}
    >
      <div className="space-y-6">
        <form onSubmit={handleVerifyOtp} className="space-y-6" noValidate>
          <FormInput
            id="otp"
            label="Verification code"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setOtp(value);
            }}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            required
            helpText="Code expires in 10 minutes."
          />

          <SubmitButton disabled={busy} busy={busy}>
            Verify code
          </SubmitButton>

          <button
            type="button"
            onClick={() =>
              navigate(isAdmin ? "/admin/forgot-password" : "/forgot-password")
            }
            className="w-full text-sm font-medium text-surface-500 transition-colors hover:text-surface-800 dark:hover:text-white"
          >
            Use a different email
          </button>
        </form>

        <div className="pt-4 text-center">
          <Link
            to={isAdmin ? "/login/admin" : "/login"}
            className="text-sm font-medium text-brand-600 hover:underline underline-offset-4"
          >
            Remembered your password?
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
