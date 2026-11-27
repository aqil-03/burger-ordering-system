import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import {
  generateVendorSessionToken,
  hashVendorSessionToken,
  VENDOR_SESSION_TTL_MS,
} from '../utils/vendorSession.js'

// A valid bcrypt hash with the same cost as real vendor passwords. It is used
// when the identifier does not exist so unknown usernames take the same time
// as a wrong password.
const DUMMY_PASSWORD_HASH =
  '$2b$12$i7V.TTrInOA4jxxEuMsOS.kOBWmLE60aC/V5dL6xkdUXk3AOPCAiG'
const MAX_ACTIVE_VENDOR_SESSIONS = 10

export function safeVendor(vendor) {
  return {
    id: vendor.id,
    name: vendor.name,
    email: vendor.email,
    username: vendor.username,
    role: vendor.role,
    lastLoginAt: vendor.lastLoginAt,
  }
}

export async function authenticateVendor({
  identifier,
  password,
  userAgent,
  ipAddress,
}) {
  const normalizedIdentifier = String(identifier ?? '')
    .trim()
    .toLowerCase()

  if (!normalizedIdentifier) return null

  const vendor = await prisma.vendor.findFirst({
    where: {
      OR: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
      ],
    },
  })

  const passwordHash = vendor?.passwordHash ?? DUMMY_PASSWORD_HASH
  const passwordMatches = await bcrypt.compare(
    String(password ?? ''),
    passwordHash,
  )

  if (!vendor || !vendor.isActive || !passwordMatches) return null

  const rawToken = generateVendorSessionToken()
  const tokenHash = hashVendorSessionToken(rawToken)
  const expiresAt = new Date(Date.now() + VENDOR_SESSION_TTL_MS)
  const now = new Date()

  const updatedVendor = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.vendor.update({
      where: { id: vendor.id },
      data: { lastLoginAt: now },
    })

    await transaction.vendorSession.deleteMany({
      where: {
        vendorId: vendor.id,
        expiresAt: { lt: now },
      },
    })

    const activeSessions = await transaction.vendorSession.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (activeSessions.length >= MAX_ACTIVE_VENDOR_SESSIONS) {
      const staleSessionIds = activeSessions
        .slice(MAX_ACTIVE_VENDOR_SESSIONS - 1)
        .map((session) => session.id)

      await transaction.vendorSession.deleteMany({
        where: { id: { in: staleSessionIds } },
      })
    }

    await transaction.vendorSession.create({
      data: {
        vendorId: vendor.id,
        tokenHash,
        expiresAt,
        userAgent: String(userAgent ?? '').slice(0, 500) || null,
        ipAddress: String(ipAddress ?? '').slice(0, 100) || null,
      },
    })

    return updated
  })

  return {
    vendor: safeVendor(updatedVendor),
    rawToken,
    expiresAt,
  }
}
