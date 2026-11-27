import { prisma } from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { removeUploadedImage } from './imageService.js'

export const DEMO_DUITNOW_QR_URL = '/payment/duitnow-demo.svg'

function serializePaymentSettings(setting) {
  return {
    duitnowQrUrl: setting?.duitnowQrUrl ?? DEMO_DUITNOW_QR_URL,
    duitnowQrIsDemo: setting?.duitnowQrIsDemo ?? true,
    paymentNote: setting?.paymentNote ?? '',
    demoQrUrl: DEMO_DUITNOW_QR_URL,
  }
}

export async function getVendorPaymentSettings() {
  const setting = await prisma.setting.findUnique({
    where: { id: 'default' },
    select: {
      duitnowQrUrl: true,
      duitnowQrIsDemo: true,
      paymentNote: true,
    },
  })

  return {
    payment: serializePaymentSettings(setting),
  }
}

export async function updateVendorPaymentQr({
  duitnowQrUrl,
  duitnowQrIsDemo,
}) {
  const isDemoImage = duitnowQrUrl === DEMO_DUITNOW_QR_URL

  if (isDemoImage !== duitnowQrIsDemo) {
    throw new AppError(
      'The demo setting must match the selected DuitNow QR image.',
      {
        status: 400,
        code: 'INVALID_PAYMENT_QR_SETTING',
      },
    )
  }

  const previous = await prisma.setting.findUnique({
    where: { id: 'default' },
    select: { duitnowQrUrl: true },
  })

  const setting = await prisma.setting.upsert({
    where: { id: 'default' },
    update: {
      duitnowQrUrl,
      duitnowQrIsDemo,
    },
    create: {
      id: 'default',
      duitnowQrUrl,
      duitnowQrIsDemo,
    },
    select: {
      duitnowQrUrl: true,
      duitnowQrIsDemo: true,
      paymentNote: true,
    },
  })

  if (
    previous?.duitnowQrUrl &&
    previous.duitnowQrUrl !== setting.duitnowQrUrl
  ) {
    await removeUploadedImage(previous.duitnowQrUrl)
  }

  return {
    payment: serializePaymentSettings(setting),
  }
}
