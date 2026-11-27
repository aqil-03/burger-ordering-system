import { Router } from 'express'
import {
  loadVendorSession,
  requireVendor,
  requireVendorCsrf,
} from '../middleware/vendorAuth.js'
import { generateMenuQrCode } from '../services/qrCodeService.js'
import { AppError } from '../utils/AppError.js'
import { vendorMenuQrQuerySchema } from '../validators/vendorSchemas.js'

const router = Router()

router.use(loadVendorSession, requireVendor, requireVendorCsrf)

router.get('/menu', async (req, res, next) => {
  try {
    const parsed = vendorMenuQrQuerySchema.safeParse(req.query)

    if (!parsed.success) {
      throw new AppError('Enter a valid menu link for the QR code.', {
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    }

    const qrCode = await generateMenuQrCode(parsed.data.url)

    res.set('Cache-Control', 'no-store')
    res.json(qrCode)
  } catch (error) {
    next(error)
  }
})

export default router
