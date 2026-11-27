import { Router } from 'express'
import {
  loadVendorSession,
  requireVendor,
  requireVendorCsrf,
} from '../middleware/vendorAuth.js'
import {
  getVendorPaymentSettings,
  updateVendorPaymentQr,
} from '../services/paymentSettingsService.js'
import { AppError } from '../utils/AppError.js'
import { vendorPaymentQrSchema } from '../validators/vendorSchemas.js'

const router = Router()

router.use(loadVendorSession, requireVendor, requireVendorCsrf)

router.get('/payment', async (req, res, next) => {
  try {
    const settings = await getVendorPaymentSettings()

    res.set('Cache-Control', 'no-store')
    res.json(settings)
  } catch (error) {
    next(error)
  }
})

router.patch('/payment', async (req, res, next) => {
  try {
    const parsed = vendorPaymentQrSchema.safeParse(req.body)

    if (!parsed.success) {
      throw new AppError('Choose a valid DuitNow QR image.', {
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    }

    const settings = await updateVendorPaymentQr(parsed.data)

    res.set('Cache-Control', 'no-store')
    res.json(settings)
  } catch (error) {
    next(error)
  }
})

export default router
