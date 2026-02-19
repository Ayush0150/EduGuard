/**
 * =====================================================
 * Standardized API Response Helpers
 * =====================================================
 *
 * Ensures consistent response format across all endpoints.
 * Use these helpers in controllers for uniform API responses.
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {Object} options
 * @param {number} [options.status=200] - HTTP status code
 * @param {string} [options.message] - Optional success message
 * @param {any} [options.data] - Response data
 */
export function sendSuccess(res, { status = 200, message, data } = {}) {
  const response = { success: true };

  if (message) response.message = message;
  if (data !== undefined) response.data = data;

  return res.status(status).json(response);
}

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {Object} options
 * @param {number} [options.status=400] - HTTP status code
 * @param {string} options.message - Error message
 * @param {Array} [options.errors] - Validation errors array
 */
export function sendError(res, { status = 400, message, errors } = {}) {
  const response = {
    success: false,
    message: message || "Request failed",
  };

  if (errors && Array.isArray(errors)) {
    response.errors = errors;
  }

  return res.status(status).json(response);
}

/**
 * Service result handler
 * Automatically handles service result objects { ok, status, message, data }
 *
 * @param {Object} res - Express response object
 * @param {Object} result - Service result object
 * @param {Object} [options]
 * @param {number} [options.successStatus=200] - Default success status
 * @param {number} [options.errorStatus=400] - Default error status
 */
export function handleServiceResult(
  res,
  result,
  { successStatus = 200, errorStatus = 400 } = {}
) {
  if (result?.ok) {
    return sendSuccess(res, {
      status: result.status ?? successStatus,
      message: result.message,
      data: result.data,
    });
  }

  return sendError(res, {
    status: result?.status ?? errorStatus,
    message: result?.message,
  });
}

/**
 * HTTP Status codes reference
 */
export const HttpStatus = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
});
