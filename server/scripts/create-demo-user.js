import dotenv from "dotenv";
import { connectMongo } from "../src/core/db/connectMongo.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

dotenv.config();

const ALLOWED_ROLES = new Set([
  "USER",
  "SECURITY",
  "MAINTENANCE",
  "PRINCIPAL",
  "ADMIN",
  "SUPER_ADMIN",
]);

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function validatePassword(password) {
  if (password.length < 8) return "must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "must include a lowercase letter";
  if (!/\d/.test(password)) return "must include a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "must include a special character";
  return null;
}

async function main() {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduguard";
  const email = normalizeEmail(
    process.env.DEMO_USER_EMAIL || "demo@eduguard.local"
  );
  const username = String(process.env.DEMO_USER_USERNAME || "demo-user").trim();
  const password = String(process.env.DEMO_USER_PASSWORD || "Demo@1234").trim();
  const role = String(process.env.DEMO_USER_ROLE || "USER")
    .trim()
    .toUpperCase();

  if (!email) {
    throw new Error("DEMO_USER_EMAIL is required");
  }

  if (!username) {
    throw new Error("DEMO_USER_USERNAME is required");
  }

  if (!ALLOWED_ROLES.has(role)) {
    throw new Error(
      `DEMO_USER_ROLE must be one of: ${Array.from(ALLOWED_ROLES).join(", ")}`
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new Error(`DEMO_USER_PASSWORD ${passwordError}`);
  }

  await connectMongo(mongoUri);

  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({
    $or: [{ email }, { username }],
  }).select("+passwordHash");

  if (!existing) {
    const created = await User.create({
      username,
      email,
      passwordHash,
      role,
      isActive: true,
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          success: true,
          action: "created",
          user: {
            id: created._id.toString(),
            username: created.username,
            email: created.email,
            role: created.role,
            isActive: created.isActive,
          },
        },
        null,
        2
      )}\n`
    );
    return;
  }

  existing.username = username;
  existing.email = email;
  existing.passwordHash = passwordHash;
  existing.role = role;
  existing.isActive = true;
  await existing.save();

  process.stdout.write(
    `${JSON.stringify(
      {
        success: true,
        action: "updated",
        user: {
          id: existing._id.toString(),
          username: existing.username,
          email: existing.email,
          role: existing.role,
          isActive: existing.isActive,
        },
      },
      null,
      2
    )}\n`
  );
}

main().catch((err) => {
  process.stderr.write(
    `\n❌ create-demo-user failed: ${err?.message || err}\n`
  );
  process.exit(1);
});
