import { prisma } from '../lib/prisma.js'
import { hashVendorSessionToken } from '../utils/vendorSession.js'

export async function findValidVendorSession(rawToken) {
  if (!rawToken) return null

  const tokenHash = hashVendorSessionToken(rawToken)
  const session = await prisma.vendorSession.findUnique({
    where: { tokenHash },
    include: { vendor: true },
  })

  if (!session) return null

  if (
    session.expiresAt.getTime() <= Date.now() ||
    !session.vendor.isActive
  ) {
    await prisma.vendorSession
      .delete({ where: { id: session.id } })
      .catch((error) => {
        console.error('Failed to remove invalid vendor session:', error)
      })
    return null
  }

  return session
}
