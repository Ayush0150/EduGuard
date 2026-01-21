import dotenv from "dotenv";
import readline from "readline";
import { env } from "../src/core/config/env.js";
import { connectMongo } from "../src/core/db/connectMongo.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

dotenv.config();

const argv = new Set(process.argv.slice(2));

function fail(message) {
  process.stderr.write(`\n❌ ${message}\n`);
  process.exit(1);
}

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

async function promptHidden(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer ?? "").trim());
    });
  });
}

async function main() {
  if (env.isProduction && !argv.has("--yes")) {
    fail(
      "Refusing to run in production without --yes (this modifies auth data)."
    );
  }

  const superAdminEmail = normalizeEmail(
    process.env.SUPER_ADMIN_EMAIL || env.superAdminEmail
  );

  if (!superAdminEmail) {
    fail("SUPER_ADMIN_EMAIL is missing in server/.env");
  }

  const username = String(process.env.SUPER_ADMIN_USERNAME || "admin").trim();
  let password = String(process.env.SUPER_ADMIN_PASSWORD || "").trim();

  // If we need to create a user and password is missing, ask interactively.
  if (!password && process.stdin.isTTY) {
    password = await promptHidden("SUPER_ADMIN password (will be hashed): ");
  }

  await connectMongo(env.mongoUri);

  const existing = await User.findOne({ email: superAdminEmail }).select(
    "+passwordHash"
  );

  if (!existing) {
    if (!password) {
      fail(
        "No SUPER_ADMIN exists and SUPER_ADMIN_PASSWORD was not provided. Set SUPER_ADMIN_PASSWORD and re-run."
      );
    }

    const created = await User.create({
      username,
      email: superAdminEmail,
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMIN",
      isActive: true,
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          success: true,
          action: "created",
          superAdmin: {
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
    process.exit(0);
  }

  // Repair invariants.
  const updates = {};
  if (existing.role !== "SUPER_ADMIN") updates.role = "SUPER_ADMIN";
  if (!existing.isActive) updates.isActive = true;

  // Optional password reset.
  if (password) {
    updates.passwordHash = await hashPassword(password);
    updates.resetOtpHash = null;
    updates.resetOtpExpiresAt = null;
    updates.resetTokenHash = null;
    updates.resetTokenExpiresAt = null;
  }

  if (Object.keys(updates).length > 0) {
    Object.assign(existing, updates);
    await existing.save();
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        success: true,
        action: Object.keys(updates).length > 0 ? "updated" : "noop",
        superAdmin: {
          id: existing._id.toString(),
          username: existing.username,
          email: existing.email,
          role: existing.role,
          isActive: existing.isActive,
          passwordUpdated: Boolean(password),
        },
      },
      null,
      2
    )}\n`
  );
}

main().catch((err) => {
  process.stderr.write(
    `\n❌ ensure-super-admin failed: ${err?.message || err}\n`
  );
  process.exit(1);
});
