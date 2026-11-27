import { prisma } from '../lib/prisma.js'
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from '../constants/payment.js'

// Payment configuration is public because the customer checkout screen needs
// the vendor's DuitNow QR image and the available payment methods.
export async function getPaymentOptions() {
  const setting = await prisma.setting.findUnique({
    where: { id: 'default' },
    select: {
      duitnowQrUrl: true,
      duitnowQrIsDemo: true,
      paymentNote: true,
    },
  })

  const duitnowQrImageUrl = setting?.duitnowQrUrl || null
  const duitnowIsDemo = setting?.duitnowQrIsDemo ?? true

  // There is no licensed payment gateway connected in this build. Do not
  // report a gateway mode until a real integration and signed callbacks exist.
  const onlineBankingMode = 'DEMO'

  return {
    currency: 'MYR',
    methods: {
      duitnow: {
        id: PAYMENT_METHOD.DUITNOW,
        label: 'DuitNow QR',
        enabled: Boolean(duitnowQrImageUrl),
        statusPreview: PAYMENT_STATUS.PENDING_VERIFICATION,
        qrImageUrl: duitnowQrImageUrl,
        isDemo: duitnowIsDemo,
        note:
          setting?.paymentNote ||
          'DuitNow payments are verified manually by the vendor before they are marked Paid.',
      },
      onlineBanking: {
        id: PAYMENT_METHOD.ONLINE_BANKING,
        label: 'Online Banking',
        enabled: true,
        mode: onlineBankingMode,
        isDemo: true,
        statusPreview: PAYMENT_STATUS.PENDING_VERIFICATION,
        note:
          'No real payment gateway is connected. This is a clearly labelled demo flow and no banking credentials are collected.',
      },
      cash: {
        id: PAYMENT_METHOD.CASH,
        label: 'Cash at Counter',
        enabled: true,
        statusPreview: PAYMENT_STATUS.PENDING_PAYMENT,
        note:
          'Pay at the counter. Payment remains Pending Payment until the vendor confirms the cash was received.',
      },
    },
    statuses: {
      paid: PAYMENT_STATUS.PAID,
      pendingVerification: PAYMENT_STATUS.PENDING_VERIFICATION,
      pendingPayment: PAYMENT_STATUS.PENDING_PAYMENT,
      failed: PAYMENT_STATUS.FAILED,
      refunded: PAYMENT_STATUS.REFUNDED,
    },
  }
}
