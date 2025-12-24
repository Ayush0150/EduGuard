export function errorHandler(err, req, res, next) {
  const status = Number(err?.statusCode ?? 500);
  const message = err?.message ?? "Internal Server Error";

  if (status >= 500) {
    // Keep server logs for debugging; avoid leaking internals to clients
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
  });
}
