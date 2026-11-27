export const PAYMENT_METHOD_IDS = Object.freeze([
  'DUITNOW',
  'ONLINE_BANKING',
  'CASH',
])

export const PAYMENT_METHOD_LABELS = Object.freeze({
  DUITNOW: 'DuitNow QR',
  ONLINE_BANKING: 'Online Banking (Demo)',
  CASH: 'Cash at Counter',
})

export const PAYMENT_STATUS_LABELS = Object.freeze({
  PAID: 'Paid',
  PENDING_VERIFICATION: 'Pending Verification',
  PENDING_PAYMENT: 'Pending Payment',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
})

export const PAYMENT_STATUS_TONES = Object.freeze({
  PAID: 'bg-leaf-100 text-leaf-700',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-800',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-cream-200 text-ink-600',
})
