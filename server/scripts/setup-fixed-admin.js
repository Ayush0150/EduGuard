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
    console.log("🔧 Setting up fixed admin account...\n");

    await connectMongo(env.mongoUri);

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: FIXED_ADMIN.email,
    });

    if (existingAdmin) {
      console.log("✅ Admin account already exists!");
      console.log(`   Email: ${FIXED_ADMIN.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Active: ${existingAdmin.isActive}`);
      console.log("\n💡 To reset password, use: npm run reset-admin-password");
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

      console.log("✅ Fixed admin account created successfully!");
      console.log("\n📧 Admin Login Credentials:");
      console.log(`   Email: ${FIXED_ADMIN.email}`);
      console.log(`   Password: ${FIXED_ADMIN.password}`);
      console.log(`   Role: ${FIXED_ADMIN.role}`);
      console.log(
        "\n🔐 You can reset this password using the forgot password flow"
      );
      console.log("   or run: npm run reset-admin-password");
    }

    console.log("\n🌐 Admin Login URL: http://localhost:5174/login/admin");
    console.log("\n✨ Setup complete!");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error setting up admin:", err.message);
    process.exit(1);
  }
}

setupFixedAdmin();
