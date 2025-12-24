import { hashPassword } from "../../core/security/password.js";
import { User } from "../users/user.model.js";

export async function createUser({
  username,
  email,
  password,
  role,
  isActive,
}) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  }).lean();

  if (existing) {
    return {
      ok: false,
      status: 409,
      message: "A user with that email or username already exists",
    };
  }

  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role,
    isActive,
  });

  return {
    ok: true,
    data: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  };
}
