/**
 * ForgotPasswordPage
 * ------------------
 * Secure password recovery entry point for EduGuard.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import adminImg from "../../../assets/admin-img.png";
import collegeImg from "../../../assets/college-img.png";

import { toast } from "../../../core/utils/toastEmitter";
import { validateIdentifier } from "../../../core/utils/validation";
import { requestResetOtp } from "../api/authApi";

import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/FormInput";
import { SubmitButton } from "../components/SubmitButton";

export default function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = location.pathname.includes("/admin");
  const backgroundImage = isAdmin ? adminImg : collegeImg;

  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);

  /* ---------------------------------------------------
     Submit handler
  --------------------------------------------------- */

  async function handleRequestOtp(e) {
    e.preventDefault();

    const identifierCheck = validateIdentifier(identifier);

    if (!identifierCheck.valid) {
      toast(identifierCheck.error, "error");
      return;
    }

    setBusy(true);

    try {
      const data = await requestResetOtp(identifierCheck.value, {
        admin: isAdmin,
      });

      toast("A verification code has been sent to your email.", "success");

      navigate(isAdmin ? "/admin/verify-otp" : "/verify-otp", {
        state: {
          identifier: identifierCheck.value,
          emailMasked: data?.data?.emailMasked ?? "",
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
      subtitle="Enter your email or username to get a verification code."
      backgroundImage={backgroundImage}
      logoLink={isAdmin ? "/login/admin" : "/login"}
    >
      <div className="space-y-6">
        {/* Recovery form */}
        <form className="space-y-6" onSubmit={handleRequestOtp} noValidate>
          <FormInput
            id="identifier"
            label="Email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="name@college.edu or username"
            autoComplete="username"
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
            className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
