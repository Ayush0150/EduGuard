import mongoose from "mongoose";
import { env } from "../src/core/config/env.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

const argv = new Set(process.argv.slice(2));

function fail(message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

if (env.nodeEnv === "production") {
  fail("Refusing to run in production.");
}

if (!argv.has("--yes")) {
  fail(
    "This will DELETE ALL users and recreate the bootstrap SUPER_ADMIN. Re-run with: node scripts/reset-bootstrap-admin.js --yes"
  );
}

await mongoose.connect(env.mongoUri);

try {
  const deleted = await User.deleteMany({});

  const adminEmail = (
    process.env.BOOTSTRAP_ADMIN_EMAIL ??
    env.superAdminEmail ??
    env.mail.user ??
    "eduguard.noreply@gmail.com"
  )
    .trim()
    .toLowerCase();

  const adminUsername = (
    process.env.BOOTSTRAP_ADMIN_USERNAME ?? "wannabeiyoush"
  ).trim();

  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "Ayush@0150";

  const admin = await User.create({
    username: adminUsername,
    email: adminEmail,
    passwordHash: await hashPassword(adminPassword),
    role: "SUPER_ADMIN",
    isActive: true,
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
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
    )
  );
} finally {
  await mongoose.disconnect();
}
