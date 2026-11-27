import { env } from '../config/env.js'
import { redactSensitiveUrl } from '../utils/redact.js'

// Express treats a middleware with four arguments as the error handler.
// Keep the `next` parameter even when it is not used.
export function errorHandler(error, req, res, next) {
  const isTooLarge = error.type === 'entity.too.large'
  const isInvalidJson = error.type === 'entity.parse.failed'
  const status = isTooLarge
    ? 413
    : isInvalidJson
      ? 400
      : Number.isInteger(error.status)
        ? error.status
        : 500

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${redactSensitiveUrl(req.originalUrl)}`,
    error,
  )

  if (res.headersSent) {
    return next(error)
  }

  const message = isTooLarge
    ? 'The request body is too large. Uploaded images must be 5 MB or smaller.'
    : isInvalidJson
      ? 'The request body contains invalid JSON.'
      : status >= 500 && env.nodeEnv === 'production'
        ? 'An unexpected server error occurred.'
        : error.message || 'An unexpected server error occurred.'

  res.status(status).json({
    error: {
      message,
      ...(error.code ? { code: error.code } : {}),
    },
  })
}
