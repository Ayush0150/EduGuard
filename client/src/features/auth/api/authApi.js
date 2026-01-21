import http from "../../../core/http";

/* ---------------------------------------------------
   Base paths
--------------------------------------------------- */

const AUTH_BASE = "/api/v1/auth";

/* ---------------------------------------------------
   Helpers
--------------------------------------------------- */

function authPath(isAdmin) {
  return isAdmin ? `${AUTH_BASE}/admin` : AUTH_BASE;
}

/* ---------------------------------------------------
   Auth
--------------------------------------------------- */

export async function login(payload, { admin = false } = {}) {
  const res = await http.post(`${authPath(admin)}/login`, payload);

  return res.data.data;
}

/* ---------------------------------------------------
   Forgot password - OTP
--------------------------------------------------- */

export async function requestResetOtp(email, { admin = false } = {}) {
  const res = await http.post(
    `${authPath(admin)}/forgot-password/request-otp`,
    { email }
  );

  return res.data;
}

export async function verifyResetOtp({ email, otp }, { admin = false } = {}) {
  const res = await http.post(`${authPath(admin)}/forgot-password/verify-otp`, {
    email,
    otp,
  });

  return res.data.data;
}

export async function resetPassword(
  { email, resetToken, newPassword },
  { admin = false } = {}
) {
  const res = await http.post(`${authPath(admin)}/forgot-password/reset`, {
    email,
    resetToken,
    newPassword,
  });

  return res.data;
}
