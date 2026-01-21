import { hashPassword } from "../../core/security/password.js";
import { logger } from "../../core/utils/logger.js";
import { User } from "../users/user.model.js";

/* =====================================================
   Constants
===================================================== */

const SAFE_USER_SELECT =
  "-passwordHash -resetOtpHash -resetOtpExpiresAt -resetTokenHash -resetTokenExpiresAt";

const FORBIDDEN_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/* =====================================================
   Helpers
===================================================== */

function isForbiddenAdminRole(role) {
  return role && FORBIDDEN_ADMIN_ROLES.has(String(role));
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username ?? "").trim();
}

function mapUser(user) {
  if (!user) return null;

  const { _id, ...rest } = user;

  return {
    id: _id.toString(),
    ...rest,
  };
}

/* =====================================================
   Create User
===================================================== */

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

  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);

  const existing = await User.findOne({
    $or: [
      { email: normalizedEmail },
      { username: normalizedUsername },
    ],
  }).lean();

  if (existing) {
    return {
      ok: false,
      status: 409,
      message: "A user with that email or username already exists.",
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
    data: mapUser({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }),
  };
}

/* =====================================================
   Get All Users
===================================================== */

export async function getAllUsers() {
  const users = await User.find()
    .select(SAFE_USER_SELECT)
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  return {
    ok: true,
    data: users.map(mapUser),
  };
}

/* =====================================================
   Get User By ID
===================================================== */

export async function getUserById(id) {
  const user = await User.findById(id)
    .select(SAFE_USER_SELECT)
    .lean();

  if (!user) {
    return {
      ok: false,
      status: 404,
      message: "User not found.",
    };
  }

  return {
    ok: true,
    data: mapUser(user),
  };
}

/* =====================================================
   Update User
===================================================== */

export async function updateUser(id, updates) {
  const user = await User.findById(id);

  if (!user) {
    return {
      ok: false,
      status: 404,
      message: "User not found.",
    };
  }

  const nextEmail =
    updates.email !== undefined
      ? normalizeEmail(updates.email)
      : undefined;

  const nextUsername =
    updates.username !== undefined
      ? normalizeUsername(updates.username)
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
        message: "Email or username already in use.",
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
        message: "Admin roles cannot be assigned.",
      };
    }
    user.role = updates.role;
  }

  if (updates.isActive !== undefined) {
    user.isActive = updates.isActive;
  }

  if (updates.password) {
    user.passwordHash = await hashPassword(updates.password);
  }

  await user.save();

  logger.info("User updated", {
    userId: user._id.toString(),
    updatedBy: "admin",
  });

  return {
    ok: true,
    data: mapUser({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }),
  };
}

/* =====================================================
   Delete User
===================================================== */

export async function deleteUser(id) {
  const user = await User.findById(id);

  if (!user) {
    return {
      ok: false,
      status: 404,
      message: "User not found.",
    };
  }

  await User.deleteOne({ _id: user._id });

  logger.warn("User deleted", {
    userId: user._id.toString(),
    email: user.email,
  });

  return { ok: true };
}

/* =====================================================
   Toggle User Status
===================================================== */

export async function toggleUserStatus(id) {
  const user = await User.findById(id);

  if (!user) {
    return {
      ok: false,
      status: 404,
      message: "User not found.",
    };
  }

  user.isActive = !user.isActive;
  await user.save();

  logger.info("User status changed", {
    userId: user._id.toString(),
    isActive: user.isActive,
  });

  return {
    ok: true,
    data: mapUser({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }),
  };
}
