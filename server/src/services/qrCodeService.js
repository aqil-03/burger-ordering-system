import QRCode from 'qrcode'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'

function normalizeMenuUrl(value) {
  const rawValue = String(value ?? '').trim() || env.publicAppUrl

  if (rawValue.length > 500) {
    throw new AppError('The menu link must be 500 characters or fewer.', {
      status: 400,
      code: 'INVALID_MENU_URL',
    })
  }

  let parsed

  try {
    parsed = new URL(rawValue)
  } catch {
    throw new AppError(
      'Enter a complete menu link, including http:// or https://.',
      {
        status: 400,
        code: 'INVALID_MENU_URL',
      },
    )
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('The menu link must use http:// or https://.', {
      status: 400,
      code: 'INVALID_MENU_URL',
    })
  }

  if (parsed.username || parsed.password) {
    throw new AppError('The menu link cannot contain a username or password.', {
      status: 400,
      code: 'INVALID_MENU_URL',
    })
  }

  parsed.hash = ''

  return parsed.toString()
}

export async function generateMenuQrCode(url) {
  const menuUrl = normalizeMenuUrl(url)

  const [setting, pngDataUrl, svg] = await Promise.all([
    prisma.setting.findUnique({
      where: { id: 'default' },
      select: { restaurantName: true },
    }),
    QRCode.toDataURL(menuUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 1024,
      color: {
        dark: '#241a15',
        light: '#ffffff',
      },
    }),
    QRCode.toString(menuUrl, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
      color: {
        dark: '#241a15',
        light: '#ffffff',
      },
    }),
  ])

  return {
    menuUrl,
    restaurantName: setting?.restaurantName || 'Burger House',
    pngDataUrl,
    svg,
  }
}
