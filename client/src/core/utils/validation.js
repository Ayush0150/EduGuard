/**
 * Client-side validation utilities for forms
 * Provides consistent, user-friendly validation across the application
 *
 * All validation functions return: { valid: boolean, error?: string, value?: any }
 * - Use the 'valid' property to check if validation passed
 * - Use 'error' property for user-friendly error messages
 * - Use 'value' property for sanitized/normalized values
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param {any} value - Value to sanitize
 * @returns {any} Sanitized value (or original if not string)
 */
export function sanitizeInput(value) {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .substring(0, 1000); // Limit length
}

/**
 * Validate email format and return normalized value
 * @param {string} email - Email address to validate
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Please enter your email address" };
  }

  const sanitized = sanitizeInput(email);

  if (!sanitized) {
    return { valid: false, error: "Please enter your email address" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return {
      valid: false,
      error: "Please enter a valid email address (e.g., user@example.com)",
    };
  }

  if (sanitized.length > 255) {
    return {
      valid: false,
      error: "Email address is too long (maximum 255 characters)",
    };
  }

  return { valid: true, value: sanitized.toLowerCase() };
}

/**
 * Validate username
 */
export function validateUsername(username) {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Please enter your username" };
  }

  const sanitized = sanitizeInput(username);

  if (!sanitized) {
    return { valid: false, error: "Please enter your username" };
  }

  if (sanitized.length < 3) {
    return {
      valid: false,
      error: "Username must be at least 3 characters long",
    };
  }

  if (sanitized.length > 50) {
    return { valid: false, error: "Username must be less than 50 characters" };
  }

  // Only allow alphanumeric, underscore, and hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;

  if (!usernameRegex.test(sanitized)) {
    return {
      valid: false,
      error:
        "Username can only contain letters, numbers, underscores (_), and hyphens (-)",
    };
  }

  return { valid: true, value: sanitized };
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Please enter your password" };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: "Password is too long (maximum 128 characters)",
    };
  }

  const checks = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const errors = [];

  if (!checks.lowercase) errors.push("one lowercase letter (a-z)");
  if (!checks.uppercase) errors.push("one uppercase letter (A-Z)");
  if (!checks.number) errors.push("one number (0-9)");
  if (!checks.symbol) errors.push("one special character (!@#$%^&*)");

  if (errors.length > 0) {
    return {
      valid: false,
      error: `Password must include at least: ${errors.join(", ")}`,
    };
  }

  return { valid: true, value: password };
}

/**
 * Validate role selection
 */
export function validateRole(role) {
  const validRoles = [
    "USER",
    "SECURITY",
    "MAINTENANCE",
    "PRINCIPAL",
    "ADMIN",
    "SUPER_ADMIN",
  ];

  if (!role) {
    return { valid: false, error: "Please select a role" };
  }

  if (!validRoles.includes(role)) {
    return { valid: false, error: "Please select a valid role from the list" };
  }

  return { valid: true, value: role };
}

/**
 * Validate OTP (6 digits)
 */
export function validateOTP(otp) {
  if (!otp || typeof otp !== "string") {
    return { valid: false, error: "Please enter the 6-digit OTP code" };
  }

  const sanitized = otp.trim();

  if (!/^\d{6}$/.test(sanitized)) {
    return { valid: false, error: "OTP must be exactly 6 digits" };
  }

  return { valid: true, value: sanitized };
}

/**
 * Validate form data
 * Returns { valid: boolean, errors: object, values: object }
 */
export function validateForm(fields) {
  const errors = {};
  const values = {};
  let isValid = true;

  Object.entries(fields).forEach(([key, { value, validator }]) => {
    if (!validator) {
      values[key] = sanitizeInput(value);
      return;
    }

    const result = validator(value);

    if (!result.valid) {
      errors[key] = result.error;
      isValid = false;
    } else {
      values[key] = result.value;
    }
  });

  return { valid: isValid, errors, values };
}

/**
 * Validate identifier (email or username)
 */
export function validateIdentifier(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return { valid: false, error: "Please enter your email or username" };
  }

  const sanitized = sanitizeInput(identifier);

  if (!sanitized) {
    return { valid: false, error: "Please enter your email or username" };
  }

  // Check if it looks like an email
  if (sanitized.includes("@")) {
    return validateEmail(sanitized);
  }

  // Otherwise validate as username
  return validateUsername(sanitized);
}
