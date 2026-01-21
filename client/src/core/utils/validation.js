/**
 * Client-side Validation Utilities
 * --------------------------------
 * Centralized reusable validation helpers for EduGuard.
 *
 * ⚠️ Frontend validation is for USER EXPERIENCE only.
 * Backend must ALWAYS re-validate all data.
 *
 * Each validator returns:
 * {
 *   valid: boolean,
 *   error?: string,
 *   value?: any
 * }
 */

/* =====================================================
   Constants
===================================================== */

const MAX_INPUT_LENGTH = 1000;
const MAX_EMAIL_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 128;

export const ROLES = [
  "USER",
  "SECURITY",
  "MAINTENANCE",
  "PRINCIPAL",
  "ADMIN",
  "SUPER_ADMIN",
];

/* =====================================================
   Sanitization
===================================================== */

/**
 * Basic client-side sanitization (UX-level only).
 * Prevents accidental markup input and limits length.
 */
export function sanitizeInput(value) {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, MAX_INPUT_LENGTH);
}

/* =====================================================
   Email
===================================================== */

export function validateEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    return { valid: false, error: "Please enter your email address" };
  }

  const sanitized = sanitizeInput(email);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return {
      valid: false,
      error: "Please enter a valid email address (e.g., user@example.com)",
    };
  }

  if (sanitized.length > MAX_EMAIL_LENGTH) {
    return {
      valid: false,
      error: "Email address is too long (maximum 255 characters)",
    };
  }

  return {
    valid: true,
    value: sanitized.toLowerCase(),
  };
}

/* =====================================================
   Username
===================================================== */

export function validateUsername(username) {
  if (typeof username !== "string" || !username.trim()) {
    return { valid: false, error: "Please enter your username" };
  }

  const sanitized = sanitizeInput(username);

  if (sanitized.length < 3) {
    return {
      valid: false,
      error: "Username must be at least 3 characters long",
    };
  }

  if (sanitized.length > 50) {
    return {
      valid: false,
      error: "Username must be less than 50 characters",
    };
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;

  if (!usernameRegex.test(sanitized)) {
    return {
      valid: false,
      error:
        "Username can only contain letters, numbers, underscores (_) and hyphens (-)",
    };
  }

  return {
    valid: true,
    value: sanitized,
  };
}

/* =====================================================
   Password
===================================================== */

export function validatePassword(password) {
  if (typeof password !== "string" || !password) {
    return { valid: false, error: "Please enter your password" };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: "Password is too long (maximum 128 characters)",
    };
  }

  const rules = {
    lowercase: /[a-z]/,
    uppercase: /[A-Z]/,
    number: /\d/,
    symbol: /[^A-Za-z0-9]/,
  };

  const missing = [];

  if (!rules.lowercase.test(password)) missing.push("one lowercase letter");
  if (!rules.uppercase.test(password)) missing.push("one uppercase letter");
  if (!rules.number.test(password)) missing.push("one number");
  if (!rules.symbol.test(password)) missing.push("one special character");

  if (missing.length) {
    return {
      valid: false,
      error: `Password must include at least: ${missing.join(", ")}`,
    };
  }

  return {
    valid: true,
    value: password,
  };
}

/* =====================================================
   Role
===================================================== */

export function validateRole(role) {
  if (!role) {
    return { valid: false, error: "Please select a role" };
  }

  if (!ROLES.includes(role)) {
    return { valid: false, error: "Please select a valid role" };
  }

  return {
    valid: true,
    value: role,
  };
}

/* =====================================================
   OTP
===================================================== */

export function validateOTP(otp) {
  if (typeof otp !== "string") {
    return { valid: false, error: "Please enter the 6-digit OTP code" };
  }

  const sanitized = otp.trim();

  if (!/^\d{6}$/.test(sanitized)) {
    return {
      valid: false,
      error: "OTP must be exactly 6 digits",
    };
  }

  return {
    valid: true,
    value: sanitized,
  };
}

/* =====================================================
   Identifier (Email OR Username)
===================================================== */

export function validateIdentifier(identifier) {
  if (typeof identifier !== "string" || !identifier.trim()) {
    return {
      valid: false,
      error: "Please enter your email or username",
    };
  }

  const sanitized = sanitizeInput(identifier);

  return sanitized.includes("@")
    ? validateEmail(sanitized)
    : validateUsername(sanitized);
}

/* =====================================================
   Form-level Validation
===================================================== */

/**
 * Validates a full form using field definitions.
 *
 * Example:
 * validateForm({
 *   email: { value: email, validator: validateEmail },
 *   password: { value: password, validator: validatePassword }
 * })
 */
export function validateForm(fields) {
  const errors = {};
  const values = {};
  let valid = true;

  Object.entries(fields).forEach(([key, config]) => {
    const { value, validator } = config;

    if (!validator) {
      values[key] = sanitizeInput(value);
      return;
    }

    const result = validator(value);

    if (!result.valid) {
      errors[key] = result.error;
      valid = false;
    } else {
      values[key] = result.value;
    }
  });

  return { valid, errors, values };
}
