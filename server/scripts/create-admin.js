import dotenv from "dotenv";
import readline from "readline";
import { connectMongo } from "../src/core/db/connectMongo.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

dotenv.config();

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
  if (password.length < 8) return "must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "must include a lowercase letter";
  if (!/\d/.test(password)) return "must include a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "must include a special character";
  return null;
}

/* ===============================
   Main
================================ */
async function createAdmin() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    process.stderr.write("\n❌ SUPER_ADMIN_EMAIL missing in .env\n");
    process.stdout.write("Example:\n");
    process.stdout.write("SUPER_ADMIN_EMAIL=admin@eduguard.com\n\n");
    process.exit(1);
  }

  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduguard";

    await connectMongo(mongoUri);
    process.stdout.write("✅ MongoDB connected\n");

    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      process.stdout.write("\n⚠️  Admin already exists\n");
      process.stdout.write(`   Email: ${existing.email}\n`);
      process.stdout.write(`   Username: ${existing.username}\n`);
      process.stdout.write(`   Role: ${existing.role}\n`);
      process.stdout.write(`   Active: ${existing.isActive}\n`);
      process.exit(0);
    }

    process.stdout.write(`\n🔐 Creating SUPER ADMIN for: ${adminEmail}\n`);

    const username = (await ask("Username (default: admin): ")) || "admin";

    process.stdout.write(
      "\nPassword rules:\n• 8+ characters\n• uppercase + lowercase\n• number\n• special character\n\n"
    );

    const password = await ask("Password: ");

    const error = validatePassword(password);
    if (error) {
      process.stderr.write(`\n❌ Password ${error}\n`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);

    const admin = await User.create({
      username,
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    });

    process.stdout.write(
      `\n✅ SUPER ADMIN CREATED SUCCESSFULLY\n──────────────────────────────────\nUsername : ${admin.username}\nEmail    : ${admin.email}\nRole     : ${admin.role}\n──────────────────────────────────\n\nLogin URL: /login/admin\n`
    );

    rl.close();
    process.exit(0);
  } catch (err) {
    process.stderr.write(`\n❌ Failed to create admin: ${err.message}\n`);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
