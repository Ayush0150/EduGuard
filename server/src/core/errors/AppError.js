/**
 * =====================================================
 * Custom API Error Class
 * =====================================================
 *
 * Provides structured error handling throughout the API.
 * Supports operational vs programming errors distinction.
 */

import { HTTP, MESSAGES } from "../constants/index.js";

/**
 * AppError
 * --------
 * Custom error class for operational errors.
 *
 * Features:
 * - Consistent error structure
 * - HTTP status code support
 * - Operational error flag
 * - Error code for client handling
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Machine-readable error code
   */
  constructor(message, statusCode = HTTP.INTERNAL_ERROR, code = null) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /* ---------------------------------------------------
     Factory Methods
  --------------------------------------------------- */

  static badRequest(message = MESSAGES.VALIDATION_ERROR, code = "BAD_REQUEST") {
    return new AppError(message, HTTP.BAD_REQUEST, code);
  }

  static unauthorized(message = MESSAGES.UNAUTHORIZED, code = "UNAUTHORIZED") {
    return new AppError(message, HTTP.UNAUTHORIZED, code);
  }

  static forbidden(message = MESSAGES.FORBIDDEN, code = "FORBIDDEN") {
    return new AppError(message, HTTP.FORBIDDEN, code);
  }

  static notFound(message = MESSAGES.NOT_FOUND, code = "NOT_FOUND") {
    return new AppError(message, HTTP.NOT_FOUND, code);
  }

  static conflict(message, code = "CONFLICT") {
    return new AppError(message, HTTP.CONFLICT, code);
  }

  static tooManyRequests(
    message = MESSAGES.TOO_MANY_REQUESTS,
    code = "RATE_LIMITED"
  ) {
    return new AppError(message, HTTP.TOO_MANY_REQUESTS, code);
  }

  static internal(message = MESSAGES.INTERNAL_ERROR, code = "INTERNAL_ERROR") {
    return new AppError(message, HTTP.INTERNAL_ERROR, code);
  }

  static validation(errors = [], code = "VALIDATION_ERROR") {
    const error = new AppError(
      MESSAGES.VALIDATION_ERROR,
      HTTP.BAD_REQUEST,
      code
    );
    error.errors = errors;
    return error;
  }

  /* ---------------------------------------------------
     Serialization
  --------------------------------------------------- */

  toJSON() {
    return {
      success: false,
      message: this.message,
      code: this.code,
      ...(this.errors && { errors: this.errors }),
    };
  }
}

export default AppError;
