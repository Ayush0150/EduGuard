import mongoose from "mongoose";
import { env } from "../src/core/config/env.js";
import { connectMongo } from "../src/core/db/connectMongo.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

/**
 * Setup fixed admin account
 * Email: eduguard.noreply@gmail.com
 * Password: Ayush@0150
 */

const FIXED_ADMIN = {
  username: "admin",
  email: "eduguard.noreply@gmail.com",
  password: "Ayush@0150",
  role: "SUPER_ADMIN",
};

async function setupFixedAdmin() {
  try {
    process.stdout.write("🔧 Setting up fixed admin account...\n\n");

    await connectMongo(env.mongoUri);

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: FIXED_ADMIN.email,
    });

    if (existingAdmin) {
      process.stdout.write("✅ Admin account already exists!\n");
      process.stdout.write(`   Email: ${FIXED_ADMIN.email}\n`);
      process.stdout.write(`   Username: ${existingAdmin.username}\n`);
      process.stdout.write(`   Role: ${existingAdmin.role}\n`);
      process.stdout.write(`   Active: ${existingAdmin.isActive}\n`);
      process.stdout.write(
        "\n💡 To reset password, use: npm run reset-admin-password\n"
      );
    } else {
      // Create new admin
      const passwordHash = await hashPassword(FIXED_ADMIN.password);

      await User.create({
        username: FIXED_ADMIN.username,
        email: FIXED_ADMIN.email,
        passwordHash,
        role: FIXED_ADMIN.role,
        isActive: true,
      });

      process.stdout.write("✅ Fixed admin account created successfully!\n");
      process.stdout.write("\n📧 Admin Login Credentials:\n");
      process.stdout.write(`   Email: ${FIXED_ADMIN.email}\n`);
      process.stdout.write(`   Password: ${FIXED_ADMIN.password}\n`);
      process.stdout.write(`   Role: ${FIXED_ADMIN.role}\n`);
      process.stdout.write(
        "\n🔐 You can reset this password using the forgot password flow\n"
      );
      process.stdout.write("   or run: npm run reset-admin-password\n");
    }

    process.stdout.write(
      "\n🌐 Admin Login URL: http://localhost:5174/login/admin\n"
    );
    process.stdout.write("\n✨ Setup complete!\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    process.stderr.write(`❌ Error setting up admin: ${err.message}\n`);
    process.exit(1);
  }
}

setupFixedAdmin();
