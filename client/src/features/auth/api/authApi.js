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

export async function verifyAdminLoginOtp({ adminId, otp }) {
  const res = await http.post(`${AUTH_BASE}/admin/login/verify-otp`, {
    adminId,
    otp,
  });

  return res.data.data;
}

export async function resendAdminLoginOtp({ adminId }) {
  const res = await http.post(`${AUTH_BASE}/admin/login/resend-otp`, {
    adminId,
  });

  return res.data;
}

/* ---------------------------------------------------
   Forgot password - OTP
--------------------------------------------------- */

export async function requestResetOtp(identifier, { admin = false } = {}) {
  const res = await http.post(
    `${authPath(admin)}/forgot-password/request-otp`,
    { identifier }
  );

  return res.data;
}

export async function verifyResetOtp(
  { identifier, otp },
  { admin = false } = {}
) {
  const res = await http.post(`${authPath(admin)}/forgot-password/verify-otp`, {
    identifier,
    otp,
  });

  return res.data.data;
}

export async function resetPassword(
  { identifier, resetToken, newPassword },
  { admin = false } = {}
) {
  const res = await http.post(`${authPath(admin)}/forgot-password/reset`, {
    identifier,
    resetToken,
    newPassword,
  });

  return res.data;
}
