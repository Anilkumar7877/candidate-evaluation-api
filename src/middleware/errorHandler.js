const AppError = require('./AppError');

function notFoundHandler(req, res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route matches ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Anything unexpected: log it, but never leak internals to the client.
  console.error(err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong while processing the request.',
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
