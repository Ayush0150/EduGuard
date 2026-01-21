import mongoose from "mongoose";
import { env } from "../src/core/config/env.js";
import { User } from "../src/modules/users/user.model.js";

async function resetUsers() {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    process.stdout.write("✅ MongoDB connected\n");

    // Delete all users except SUPER_ADMIN
    const { deletedCount } = await User.deleteMany({
      role: { $ne: "SUPER_ADMIN" },
    });

    process.stdout.write(`🗑️  Deleted ${deletedCount} regular users\n`);
    process.stdout.write("🔐 SUPER_ADMIN account preserved\n");

    // Show remaining users
    const remainingUsers = await User.find()
      .select("username email role")
      .lean();

    process.stdout.write("\n📋 Remaining users:\n");
    remainingUsers.forEach((u) => {
      process.stdout.write(`   • ${u.username} (${u.email}) — ${u.role}\n`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    process.stderr.write(`\n❌ Reset failed: ${err.message}\n`);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetUsers();
