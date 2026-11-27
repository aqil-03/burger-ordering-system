import { Router } from 'express'
import { createOrder, getPublicOrderByTrackingToken } from '../services/orderService.js'
import { getPublicQueueState } from '../services/queueStateService.js'
import {
  notifyQueueChanged,
  notifyVendorOrdersChanged,
} from '../realtime/socket.js'
import { AppError } from '../utils/AppError.js'
import {
  orderCreationLimiter,
  orderTrackingLimiter,
} from '../middleware/rateLimiters.js'
import {
  createOrderSchema,
  trackingTokenSchema,
} from '../validators/orderSchemas.js'

const router = Router()

function parseOrThrow(schema, value, message) {
  const result = schema.safeParse(value)

  if (!result.success) {
    console.warn('Order request validation failed:', result.error.issues)
    throw new AppError(message, {
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  }

  return result.data
}

// POST /api/orders
// Public endpoint where a customer submits a cart. Prices, availability,
// payment status, order status and queue numbers are all derived on the server.
router.post('/', orderCreationLimiter, async (req, res, next) => {
  try {
    const payload = parseOrThrow(
      createOrderSchema,
      req.body,
      'Please check your order details and try again.',
    )
    const result = await createOrder(payload)

    if (result.idempotent) {
      res.set('Cache-Control', 'no-store')
      return res.status(200).json(result)
    }

    notifyVendorOrdersChanged()
    void notifyQueueChanged(result.order.queueDate)

    res.set('Cache-Control', 'no-store')
    res.set('Location', `/api/orders/${result.order.trackingToken}`)
    return res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

// GET /api/orders/:trackingToken
// The random tracking token is the customer's access key. This response
// deliberately excludes the customer's name, phone number and internal IDs.
router.get('/:trackingToken', orderTrackingLimiter, async (req, res, next) => {
  try {
    const trackingToken = parseOrThrow(
      trackingTokenSchema,
      req.params.trackingToken,
      'This order link is invalid.',
    )
    const order = await getPublicOrderByTrackingToken(trackingToken)
    const queue = await getPublicQueueState(order.queueDate)

    res.set('Cache-Control', 'no-store')
    res.json({ order, queue })
  } catch (error) {
    next(error)
  }
})

export default router
