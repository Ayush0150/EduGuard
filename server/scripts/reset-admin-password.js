import mongoose from "mongoose";
import readline from "readline";
import { env } from "../src/core/config/env.js";
import { connectMongo } from "../src/core/db/connectMongo.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

const ADMIN_EMAIL = "eduguard.noreply@gmail.com";

/* ===============================
   CLI helpers
================================ */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) =>
  new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));

/* ===============================
   Password validation
================================ */
function validatePassword(password) {
  if (password.length < 8) return "minimum 8 characters required";
  if (!/[A-Z]/.test(password)) return "must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "must contain a lowercase letter";
  if (!/\d/.test(password)) return "must contain a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "must contain a special character";
  return null;
}

/* ===============================
   Main logic
================================ */
async function resetAdminPassword() {
  try {
    process.stdout.write("\n🔐 RESET SUPER ADMIN PASSWORD\n");
    process.stdout.write("─────────────────────────────\n");
    process.stdout.write(`Admin Email: ${ADMIN_EMAIL}\n\n`);

    await connectMongo(env.mongoUri);

    const admin = await User.findOne({ email: ADMIN_EMAIL });

    if (!admin) {
      process.stderr.write(`❌ Admin not found: ${ADMIN_EMAIL}\n`);
      process.stdout.write("💡 Run: npm run setup-admin\n");
      process.exit(1);
    }

    const newPassword = await ask("New password: ");

    const error = validatePassword(newPassword);
    if (error) {
      process.stderr.write(`❌ Password ${error}\n`);
      process.exit(1);
    }

    const confirm = await ask("Confirm password: ");

    if (newPassword !== confirm) {
      process.stderr.write("❌ Passwords do not match\n");
      process.exit(1);
    }

    admin.passwordHash = await hashPassword(newPassword);

    // clear reset fields
    admin.resetOtpHash = null;
    admin.resetOtpExpiresAt = null;
    admin.resetTokenHash = null;
    admin.resetTokenExpiresAt = null;

    await admin.save();

    process.stdout.write("\n✅ Password reset successful!\n");
    process.stdout.write(`📧 Admin: ${ADMIN_EMAIL}\n`);
    process.stdout.write("🌐 Login: http://localhost:5174/login/admin\n\n");

    await mongoose.disconnect();
    rl.close();
    process.exit(0);
  } catch (err) {
    process.stderr.write(`\n❌ Reset failed: ${err.message}\n`);
    await mongoose.disconnect();
    rl.close();
    process.exit(1);
  }
}

resetAdminPassword();
