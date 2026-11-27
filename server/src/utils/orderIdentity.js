import { randomBytes } from 'node:crypto'

export function generateOrderReference(queueDate) {
  const datePart = String(queueDate ?? '').replaceAll('-', '')
  const randomPart = randomBytes(4).toString('hex').toUpperCase()

  return `BRG-${datePart}-${randomPart}`
}

export function generateTrackingToken() {
  return randomBytes(24).toString('base64url')
}
