import { hashPassword } from "../../core/security/password.js";
import { logger } from "../../core/utils/logger.js";
import { User } from "../users/user.model.js";

const SAFE_USER_SELECT =
  "-passwordHash -resetOtpHash -resetOtpExpiresAt -resetTokenHash -resetTokenExpiresAt";

const FORBIDDEN_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

function isForbiddenAdminRole(role) {
  return role && FORBIDDEN_ADMIN_ROLES.has(String(role));
}

function toClientUser(userDoc) {
  if (!userDoc) return userDoc;
  const { _id, ...rest } = userDoc;
  return {
    id: _id?.toString?.() ?? String(_id),
    ...rest,
  };
}

export async function createUser({
  username,
  email,
  password,
  role,
  isActive,
}) {
  if (isForbiddenAdminRole(role)) {
    return {
      ok: false,
      status: 403,
      message: "Admin roles cannot be assigned via user management.",
    };
  }

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

  logger.info("User created", {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
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

export async function getAllUsers() {
  // Optimized query: exclude sensitive fields, sort by most recent, limit results
  const users = await User.find({})
    .select(SAFE_USER_SELECT)
    .sort({ createdAt: -1 })
    .limit(1000) // Prevent loading too many users at once
    .lean();

  return {
    ok: true,
    data: { success: true, data: users.map(toClientUser) },
  };
}

export async function getUserById(id) {
  const user = await User.findById(id).select(SAFE_USER_SELECT).lean();

  if (!user) {
    return { ok: false, status: 404, message: "User not found" };
  }

  return {
    ok: true,
    data: { success: true, data: toClientUser(user) },
  };
}

export async function updateUser(id, updates) {
  const user = await User.findById(id);
  if (!user) {
    return { ok: false, status: 404, message: "User not found" };
  }

  const nextEmail =
    updates.email !== undefined
      ? String(updates.email).trim().toLowerCase()
      : undefined;
  const nextUsername =
    updates.username !== undefined
      ? String(updates.username).trim()
      : undefined;

  if (nextEmail || nextUsername) {
    const conflict = await User.findOne({
      _id: { $ne: user._id },
      $or: [
        ...(nextEmail ? [{ email: nextEmail }] : []),
        ...(nextUsername ? [{ username: nextUsername }] : []),
      ],
    }).lean();

    if (conflict) {
      return {
        ok: false,
        status: 409,
        message: "A user with that email or username already exists",
      };
    }
  }

  if (nextEmail !== undefined) user.email = nextEmail;
  if (nextUsername !== undefined) user.username = nextUsername;
  if (updates.role !== undefined) {
    if (isForbiddenAdminRole(updates.role)) {
      return {
        ok: false,
        status: 403,
        message: "Admin roles cannot be assigned via user management.",
      };
    }
    user.role = updates.role;
  }
  if (updates.isActive !== undefined) user.isActive = updates.isActive;

  if (updates.password) {
    user.passwordHash = await hashPassword(updates.password);
  }

  await user.save();

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

export async function deleteUser(id) {
  const user = await User.findById(id);
  if (!user) {
    return { ok: false, status: 404, message: "User not found" };
  }

  await User.deleteOne({ _id: user._id });

  logger.warn("User deleted", {
    userId: user._id.toString(),
    email: user.email,
  });

  return { ok: true };
}

export async function toggleUserStatus(id) {
  const user = await User.findById(id);
  if (!user) {
    return { ok: false, status: 404, message: "User not found" };
  }

  user.isActive = !user.isActive;
  await user.save();

  logger.info("User status toggled", {
    userId: user._id.toString(),
    email: user.email,
    isActive: user.isActive,
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
