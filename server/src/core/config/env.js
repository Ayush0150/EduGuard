import dotenv from "dotenv";

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getNodeEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (!["development", "production", "test"].includes(nodeEnv)) {
    console.warn(`Invalid NODE_ENV: ${nodeEnv}, defaulting to development`);
    return "development";
  }
  return nodeEnv;
}

export const env = {
  nodeEnv: getNodeEnv(),
  isProduction: getNodeEnv() === "production",
  isDevelopment: getNodeEnv() === "development",
  port: Number(process.env.PORT ?? 8080),
  mongoUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase(),
  adminRecoveryEmail: (process.env.ADMIN_RECOVERY_EMAIL ?? "")
    .trim()
    .toLowerCase(),
  mail: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: String(process.env.SMTP_SECURE ?? "true") === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from:
      process.env.MAIL_FROM ??
      (process.env.SMTP_USER
        ? `EduGuard Security <${process.env.SMTP_USER}>`
        : "EduGuard <no-reply@eduguard.local>"),
  },
};
