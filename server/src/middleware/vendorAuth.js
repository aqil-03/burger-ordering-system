import { prisma } from '../lib/prisma.js'
import { findValidVendorSession } from '../services/vendorSessionService.js'
import {
  csrfTokensMatch,
  generateVendorCsrfToken,
  VENDOR_COOKIE_NAME,
  VENDOR_CSRF_COOKIE_NAME,
  VENDOR_CSRF_HEADER_NAME,
  vendorClearCookieOptions,
  vendorCsrfClearCookieOptions,
  vendorCsrfCookieOptions,
} from '../utils/vendorSession.js'

const LAST_USED_UPDATE_INTERVAL_MS = 60 * 60 * 1000
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function loadVendorSession(req, res, next) {
  const rawToken = req.cookies?.[VENDOR_COOKIE_NAME]

  if (!rawToken) {
    req.vendor = null
    req.vendorSession = null
    return next()
  }

  try {
    const session = await findValidVendorSession(rawToken)

    if (!session) {
      res.clearCookie(VENDOR_COOKIE_NAME, vendorClearCookieOptions())
      res.clearCookie(
        VENDOR_CSRF_COOKIE_NAME,
        vendorCsrfClearCookieOptions(),
      )
      req.vendor = null
      req.vendorSession = null
      return next()
    }

    req.vendor = session.vendor
    req.vendorSession = session

    const currentCsrfToken = req.cookies?.[VENDOR_CSRF_COOKIE_NAME]

    if (
      typeof currentCsrfToken !== 'string' ||
      currentCsrfToken.length < 32
    ) {
      const csrfToken = generateVendorCsrfToken()
      res.cookie(
        VENDOR_CSRF_COOKIE_NAME,
        csrfToken,
        vendorCsrfCookieOptions(),
      )
      req.cookies[VENDOR_CSRF_COOKIE_NAME] = csrfToken
    }

    if (
      Date.now() - session.lastUsedAt.getTime() >
      LAST_USED_UPDATE_INTERVAL_MS
    ) {
      prisma.vendorSession
        .update({
          where: { id: session.id },
          data: { lastUsedAt: new Date() },
        })
        .catch((error) => {
          console.error('Failed to update vendor session activity:', error)
        })
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireVendor(req, res, next) {
  if (!req.vendor) {
    return res.status(401).json({
      error: {
        message: 'Vendor authentication required.',
        code: 'UNAUTHORIZED',
      },
    })
  }

  return next()
}

export function requireVendorCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next()
  }

  const cookieToken = req.cookies?.[VENDOR_CSRF_COOKIE_NAME]
  const headerToken = req.get(VENDOR_CSRF_HEADER_NAME)

  if (!csrfTokensMatch(cookieToken, headerToken)) {
    return res.status(403).json({
      error: {
        message:
          'Your security token is missing or invalid. Refresh the page and try again.',
        code: 'CSRF_INVALID',
      },
    })
  }

  return next()
}
