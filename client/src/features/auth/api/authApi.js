import http from "../../../core/http";

export async function login(payload) {
  const res = await http.post("/api/v1/auth/login", payload);
  return res.data.data;
}

export async function adminLogin(payload) {
  const res = await http.post("/api/v1/auth/admin/login", payload);
  return res.data.data;
}

export async function requestResetOtp(email) {
  const res = await http.post("/api/v1/auth/forgot-password/request-otp", {
    email,
  });
  return res.data;
}

export async function requestAdminResetOtp(email) {
  const res = await http.post(
    "/api/v1/auth/admin/forgot-password/request-otp",
    {
      email,
    }
  );
  return res.data;
}

export async function verifyResetOtp({ email, otp }) {
  const res = await http.post("/api/v1/auth/forgot-password/verify-otp", {
    email,
    otp,
  });
  return res.data.data;
}

export async function verifyAdminResetOtp({ email, otp }) {
  const res = await http.post("/api/v1/auth/admin/forgot-password/verify-otp", {
    email,
    otp,
  });
  return res.data.data;
}

export async function resetPassword({ email, resetToken, newPassword }) {
  const res = await http.post("/api/v1/auth/forgot-password/reset", {
    email,
    resetToken,
    newPassword,
  });
  return res.data;
}

export async function resetAdminPassword({ email, resetToken, newPassword }) {
  const res = await http.post("/api/v1/auth/admin/forgot-password/reset", {
    email,
    resetToken,
    newPassword,
  });
  return res.data;
}
