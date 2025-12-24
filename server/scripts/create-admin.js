import { connectMongo } from "../src/core/db/connectMongo.js";
import { hashPassword } from "../src/core/security/password.js";
import { User } from "../src/modules/users/user.model.js";

async function createAdmin() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/eduguard";
    await connectMongo(mongoUri);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [
        { username: "wannabeiyoush" },
        { email: "eduguard.noreply@gmail.com" },
      ],
    });

    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.username);
      process.exit(0);
    }

    // Create admin user
    const passwordHash = await hashPassword("Ayush@0150");
    const admin = await User.create({
      username: "wannabeiyoush",
      email: "eduguard.noreply@gmail.com",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    });

    console.log("Admin user created successfully:");
    console.log("  Username:", admin.username);
    console.log("  Email:", admin.email);
    console.log("  Role:", admin.role);
    console.log("  Password: Ayush@0150");

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error.message);
    process.exit(1);
  }
}

createAdmin();
