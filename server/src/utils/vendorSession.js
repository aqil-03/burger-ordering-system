import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'

export const VENDOR_COOKIE_NAME = 'bh_vendor_session'
export const VENDOR_CSRF_COOKIE_NAME = 'bh_vendor_csrf'
export const VENDOR_CSRF_HEADER_NAME = 'x-csrf-token'
export const VENDOR_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function hashVendorSessionToken(rawToken) {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function generateVendorSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function generateVendorCsrfToken() {
  return randomBytes(32).toString('base64url')
}

export function csrfTokensMatch(cookieToken, headerToken) {
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return false
  }

  const cookieBuffer = Buffer.from(cookieToken)
  const headerBuffer = Buffer.from(headerToken)

  return (
    cookieBuffer.length === headerBuffer.length &&
    timingSafeEqual(cookieBuffer, headerBuffer)
  )
}

export function vendorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: VENDOR_SESSION_TTL_MS,
  }
}

export function vendorClearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.nodeEnv === 'production',
    path: '/',
  }
}

export function vendorCsrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'strict',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: VENDOR_SESSION_TTL_MS,
  }
}

export function vendorCsrfClearCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'strict',
    secure: env.nodeEnv === 'production',
    path: '/',
  }
}
