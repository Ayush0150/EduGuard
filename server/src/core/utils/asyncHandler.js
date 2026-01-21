/**
 * asyncHandler
 * ------------
 * Wraps async route handlers and forwards errors to Express error middleware.
 *
 * Usage:
 *   router.get("/route", asyncHandler(async (req, res) => {
 *     ...
 *   }));
 *
 * This prevents repetitive try/catch blocks in controllers.
 */
export function asyncHandler(handler) {
  return function asyncMiddleware(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
