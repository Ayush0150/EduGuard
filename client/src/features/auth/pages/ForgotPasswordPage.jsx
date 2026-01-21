/**
 * ForgotPasswordPage
 * ------------------
 * Secure password recovery entry point for EduGuard.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import adminImg from "../../../assets/admin-img.avif";
import collegeImg from "../../../assets/college-img.png";

import { toast } from "../../../core/utils/toastEmitter";
import { validateEmail } from "../../../core/utils/validation";
import { requestResetOtp } from "../api/authApi";

import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/FormInput";
import { SubmitButton } from "../components/SubmitButton";

export default function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = location.pathname.includes("/admin");
  const backgroundImage = isAdmin ? adminImg : collegeImg;

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  /* ---------------------------------------------------
     Submit handler
  --------------------------------------------------- */

  async function handleRequestOtp(e) {
    e.preventDefault();

    const emailCheck = validateEmail(email);

    if (!emailCheck.valid) {
      toast(emailCheck.error, "error");
      return;
    }

    setBusy(true);

    try {
      await requestResetOtp(emailCheck.value, { admin: isAdmin });

      toast("A verification code has been sent to your email.", "success");

      navigate(isAdmin ? "/admin/verify-otp" : "/verify-otp", {
        state: {
          email: emailCheck.value,
          admin: isAdmin,
        },
      });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to send verification code. Please try again.";

      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email to get a verification code."
      backgroundImage={backgroundImage}
      logoLink={isAdmin ? "/login/admin" : "/login"}
    >
      <div className="space-y-6">
        {/* Recovery form */}
        <form className="space-y-6" onSubmit={handleRequestOtp} noValidate>
          <FormInput
            id="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@college.edu"
            autoComplete="email"
            required
          />

          <SubmitButton disabled={busy} busy={busy}>
            Send code
          </SubmitButton>
        </form>

        {/* Footer */}
        <div className="pt-4 text-center">
          <Link
            to={isAdmin ? "/login/admin" : "/login"}
            className="text-sm font-semibold text-brand-600 hover:underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
