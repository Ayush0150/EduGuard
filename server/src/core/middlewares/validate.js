/**
 * Zod request body validation middleware
 * -------------------------------------
 *
 * Features:
 * - Consistent error response format
 * - Safe parsing (never throws)
 * - Clean error mapping
 * - Prevents malformed payloads from reaching controllers
 *
 * Used in:
 * - Auth routes
 * - Admin routes
 * - Any protected API input
 */

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: errors[0]?.message || "Invalid request data",
        errors,
      });
    }

    // ✅ Replace body with validated & transformed data
    req.body = parsed.data;

    next();
  };
}

/**
 * Validate MongoDB ObjectId route param
 * @param {string} paramName
 */
export function validateObjectIdParam(paramName = "id") {
  return (req, res, next) => {
    const value = String(req.params?.[paramName] ?? "").trim();
    const isValid = /^[0-9a-fA-F]{24}$/.test(value);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    next();
  };
}
