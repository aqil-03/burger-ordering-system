import rateLimit from 'express-rate-limit'

function createJsonRateLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        message,
        code: 'RATE_LIMITED',
      },
    },
  })
}

// Public order creation is expensive and fills the queue, so limit repeated
// submissions from the same client address.
export const orderCreationLimiter = createJsonRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message:
    'Too many order attempts. Please wait a few minutes and try again.',
})

// Tracking tokens are random, but limiting lookups makes brute-force attempts
// noisy and expensive. Normal refreshes stay well below this limit.
export const orderTrackingLimiter = createJsonRateLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: 'Too many order lookups. Please wait a moment and try again.',
})

// Uploads write files to disk, so cap them even for an authenticated vendor.
export const vendorUploadLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message:
    'Too many image uploads. Please wait a few minutes and try again.',
})
