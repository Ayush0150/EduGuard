/**
 * ResetPasswordPage
 * -----------------
 * Secure password reset flow for EduGuard platform.
 */

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import adminImg from "../../../assets/admin-img.png";
import collegeImg from "../../../assets/college-img.png";

import { toast } from "../../../core/utils/toastEmitter";
import { validatePassword } from "../../../core/utils/validation";
import { resetPassword } from "../api/authApi";

import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { SubmitButton } from "../components/SubmitButton";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = location.pathname.includes("/admin");
  const backgroundImage = isAdmin ? adminImg : collegeImg;

  const [identifier, setIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  /* ---------------------------------------------------
     Load reset context
  --------------------------------------------------- */

  useEffect(() => {
    const stateIdentifier = location.state?.identifier;
    const stateToken = location.state?.resetToken;

    if (stateIdentifier && stateToken) {
      setIdentifier(stateIdentifier);
      setResetToken(stateToken);
      return;
    }

    toast(
      "Your reset session has expired. Please restart password recovery.",
      "error"
    );
  }, [location.state]);

  /* ---------------------------------------------------
     Submit handler
  --------------------------------------------------- */

  async function handleResetPassword(e) {
    e.preventDefault();

    if (!identifier || !resetToken) {
      const message =
        "Your reset session has expired. Please restart password recovery.";
      toast(message, "error");
      return;
    }

    const passwordCheck = validatePassword(newPassword);

    if (!passwordCheck.valid) {
      toast(passwordCheck.error, "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = "The passwords you entered do not match.";
      toast(message, "error");
      return;
    }

    setBusy(true);

    try {
      await resetPassword(
        {
          identifier,
          resetToken,
          newPassword: passwordCheck.value,
        },
        { admin: isAdmin }
      );

      toast("Your password has been updated successfully.", "success");
      setCompleted(true);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to update password at this time.";

      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={completed ? "Password updated" : "Reset password"}
      subtitle={
        completed
          ? "Your password has been updated."
          : "Create a new password to continue."
      }
      backgroundImage={backgroundImage}
      logoLink={isAdmin ? "/login/admin" : "/login"}
    >
      <div className="space-y-6">
        {/* Reset form */}
        {!completed && (
          <form className="space-y-6" onSubmit={handleResetPassword} noValidate>
            <PasswordInput
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <SubmitButton disabled={busy} busy={busy}>
              Update password
            </SubmitButton>
          </form>
        )}

        {/* Success state */}
        {completed && (
          <SubmitButton
            type="button"
            onClick={() =>
              navigate(isAdmin ? "/login/admin" : "/login", {
                replace: true,
              })
            }
          >
            Continue to sign in
          </SubmitButton>
        )}

        {/* Footer link */}
        {!completed && (
          <div className="pt-4 text-center">
            <Link
              to={isAdmin ? "/login/admin" : "/login"}
              className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
