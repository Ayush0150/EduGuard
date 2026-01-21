import mongoose from "mongoose";
import { env } from "../src/core/config/env.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

/* ===============================
   CLI safety
================================ */
const argv = new Set(process.argv.slice(2));

function fail(message) {
  process.stderr.write(`❌ ${message}\n`);
  process.exit(1);
}

if (env.nodeEnv === "production") {
  fail("Refusing to run in production.");
}

if (!argv.has("--yes")) {
  fail(
    "This will DELETE ALL users and recreate the SUPER_ADMIN.\n" +
      "Re-run with:\n" +
      "node scripts/reset-bootstrap-admin.js --yes"
  );
}

/* ===============================
   Main
================================ */
async function resetBootstrapAdmin() {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    const deleted = await User.deleteMany({});

    const adminEmail = (
      process.env.BOOTSTRAP_ADMIN_EMAIL ||
      env.superAdminEmail ||
      env.mail?.user ||
      "eduguard.noreply@gmail.com"
    )
      .trim()
      .toLowerCase();

    const adminUsername = (
      process.env.BOOTSTRAP_ADMIN_USERNAME || "admin"
    ).trim();

    const adminPassword =
      process.env.BOOTSTRAP_ADMIN_PASSWORD || "ChangeMe@123";

    if (!adminPassword || adminPassword.length < 8) {
      fail("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.");
    }

    const admin = await User.create({
      username: adminUsername,
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "SUPER_ADMIN",
      isActive: true,
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          success: true,
          deletedUsers: deleted.deletedCount ?? 0,
          createdAdmin: {
            id: admin._id.toString(),
            username: admin.username,
            email: admin.email,
            role: admin.role,
          },
        },
        null,
        2
      )}\n`
    );
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetBootstrapAdmin();
