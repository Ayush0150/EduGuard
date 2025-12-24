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

  const admin = await User.create({
    username: env.bootstrap.username,
    email: String(env.bootstrap.email).toLowerCase(),
    passwordHash: await hashPassword(env.bootstrap.password),
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
