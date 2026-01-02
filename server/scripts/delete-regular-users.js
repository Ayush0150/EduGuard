import mongoose from "mongoose";
import { env } from "../src/core/config/env.js";
import { User } from "../src/modules/users/user.model.js";

await mongoose.connect(env.mongoUri);

try {
  // Delete all users except SUPER_ADMIN
  const result = await User.deleteMany({
    role: { $ne: "SUPER_ADMIN" },
  });

  console.log("✅ Deleted", result.deletedCount, "regular users");
  console.log("✅ Admin account preserved");

  // Show remaining users
  const remaining = await User.find({}).select("username email role");
  console.log("\n📋 Remaining users:");
  remaining.forEach((u) => {
    console.log(`   - ${u.username} (${u.email}) - ${u.role}`);
  });

  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
