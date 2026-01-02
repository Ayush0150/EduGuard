import dotenv from "dotenv";
import readline from "readline";
import { connectMongo } from "../src/core/db/connectMongo.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

    if (!adminEmail) {
      console.error("❌ Error: SUPER_ADMIN_EMAIL is not set in .env file");
      console.log("\nPlease set SUPER_ADMIN_EMAIL in server/.env");
      console.log("Example: SUPER_ADMIN_EMAIL=your-admin@example.com");
      process.exit(1);
    }

    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/eduguard";
    await connectMongo(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: adminEmail,
    });

    if (existingAdmin) {
      console.log(`\n⚠️  Admin user already exists with email: ${adminEmail}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Active: ${existingAdmin.isActive}`);
      console.log(
        "\n💡 To reset this admin account, run: node scripts/reset-bootstrap-admin.js"
      );
      process.exit(0);
    }

    console.log(`\n🔧 Creating admin account for: ${adminEmail}`);

    // Get username
    const username = await question("\nEnter username (default: admin): ");
    const finalUsername = username.trim() || "admin";

    // Get password
    console.log("\n📝 Password Requirements:");
    console.log("   - Minimum 8 characters");
    console.log("   - At least one uppercase letter");
    console.log("   - At least one lowercase letter");
    console.log("   - At least one number");
    console.log("   - At least one special character");

    const password = await question("\nEnter password: ");

    if (!password || password.length < 8) {
      console.error("\n❌ Password must be at least 8 characters");
      process.exit(1);
    }

    // Validate password strength
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      console.error("\n❌ Password does not meet strength requirements");
      process.exit(1);
    }

    // Create admin user
    const passwordHash = await hashPassword(password);
    const admin = await User.create({
      username: finalUsername,
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    });

    console.log("\n✅ Admin user created successfully!");
    console.log("   ╔══════════════════════════════════════════╗");
    console.log(`   ║ Username: ${admin.username.padEnd(30)} ║`);
    console.log(`   ║ Email:    ${admin.email.padEnd(30)} ║`);
    console.log(`   ║ Role:     ${admin.role.padEnd(30)} ║`);
    console.log("   ╚══════════════════════════════════════════╝");
    console.log("\n🔐 Keep your password safe!");
    console.log("📧 Use this email to login at: /login/admin");
    console.log("🔄 To reset password, use the forgot-password flow");

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating admin:", error.message);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
