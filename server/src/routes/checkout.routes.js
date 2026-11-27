import { Router } from 'express'
import { getPaymentOptions } from '../services/paymentOptionsService.js'

const router = Router()

// GET /api/checkout/payment-options
// Public, read-only payment configuration used by the checkout screen.
router.get('/payment-options', async (req, res, next) => {
  try {
    const options = await getPaymentOptions()

    res.set('Cache-Control', 'no-store')
    res.json(options)
  } catch (error) {
    next(error)
  }
})

export default router
