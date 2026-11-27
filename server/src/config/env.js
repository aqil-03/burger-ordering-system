import 'dotenv/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultUploadsDir = fileURLToPath(
  new URL('../../uploads', import.meta.url),
)

function readPort(value) {
  const port = Number(value ?? 4000)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a whole number between 1 and 65535.')
  }

  return port
}

function readTrustProxy(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (!normalized || normalized === 'false' || normalized === '0') {
    return false
  }

  if (normalized === 'true') return true

  const hops = Number(normalized)

  if (!Number.isInteger(hops) || hops < 1 || hops > 10) {
    throw new Error(
      'TRUST_PROXY must be false, true, or a trusted proxy hop count from 1 to 10.',
    )
  }

  return hops
}

function readPublicAppUrl(value) {
  const raw = String(value ?? 'http://localhost:5173').trim()
  let parsed

  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(
      'PUBLIC_APP_URL must be a complete http:// or https:// URL.',
    )
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('PUBLIC_APP_URL must use http:// or https://.')
  }

  if (parsed.username || parsed.password) {
    throw new Error('PUBLIC_APP_URL cannot contain a username or password.')
  }

  return raw
}

function readUploadsDir(value) {
  const raw = String(value ?? '').trim()
  return raw ? resolve(raw) : defaultUploadsDir
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing. Copy server/.env.example to server/.env.',
  )
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readPort(process.env.PORT),
  host: process.env.HOST ?? '0.0.0.0',
  publicAppUrl: readPublicAppUrl(process.env.PUBLIC_APP_URL),
  trustProxy: readTrustProxy(process.env.TRUST_PROXY),
  uploadsDir: readUploadsDir(process.env.UPLOADS_DIR),
})
