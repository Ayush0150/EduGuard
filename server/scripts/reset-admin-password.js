import mongoose from "mongoose";
import readline from "readline";
import { env } from "../src/core/config/env.js";
import { connectMongo } from "../src/core/db/connectMongo.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

const ADMIN_EMAIL = "eduguard.noreply@gmail.com";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function resetAdminPassword() {
  try {
    console.log("🔐 Reset Admin Password\n");
    console.log(`Admin Email: ${ADMIN_EMAIL}\n`);

    await connectMongo(env.mongoUri);

    const admin = await User.findOne({ email: ADMIN_EMAIL });

    if (!admin) {
      console.error(`❌ Admin account not found: ${ADMIN_EMAIL}`);
      console.log("\n💡 Run: npm run setup-admin");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Get new password
    const newPassword = await question("Enter new password: ");

    if (!newPassword || newPassword.length < 8) {
      console.error("❌ Password must be at least 8 characters");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Validate password strength
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      console.error(
        "❌ Password must include: uppercase, lowercase, number, and symbol"
      );
      await mongoose.disconnect();
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await question("Confirm new password: ");

    if (newPassword !== confirmPassword) {
      console.error("❌ Passwords do not match");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Update password
    admin.passwordHash = await hashPassword(newPassword);
    admin.resetOtpHash = null;
    admin.resetOtpExpiresAt = null;
    admin.resetTokenHash = null;
    admin.resetTokenExpiresAt = null;
    await admin.save();

    console.log("\n✅ Password updated successfully!");
    console.log(`\n📧 Admin Login: ${ADMIN_EMAIL}`);
    console.log("🌐 Login URL: http://localhost:5174/login/admin");

    await mongoose.disconnect();
    rl.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error resetting password:", err.message);
    rl.close();
    process.exit(1);
  }
}

resetAdminPassword();
