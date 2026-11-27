import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticateVendor, safeVendor } from '../services/vendorAuthService.js'
import { getVendorDashboard } from '../services/vendorDashboardService.js'
import {
  performVendorOrderAction,
  updateVendorPaymentStatus,
} from '../services/vendorOrderManagementService.js'
import {
  loadVendorSession,
  requireVendor,
  requireVendorCsrf,
} from '../middleware/vendorAuth.js'
import { prisma } from '../lib/prisma.js'
import {
  notifyOrderUpdated,
  notifyQueueChanged,
  notifyVendorOrdersChanged,
} from '../realtime/socket.js'
import { AppError } from '../utils/AppError.js'
import {
  generateVendorCsrfToken,
  hashVendorSessionToken,
  VENDOR_COOKIE_NAME,
  VENDOR_CSRF_COOKIE_NAME,
  vendorClearCookieOptions,
  vendorCookieOptions,
  vendorCsrfClearCookieOptions,
  vendorCsrfCookieOptions,
} from '../utils/vendorSession.js'
import {
  vendorLoginSchema,
  vendorOrderActionSchema,
  vendorOrderIdSchema,
  vendorPaymentUpdateSchema,
} from '../validators/vendorSchemas.js'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: {
      message:
        'Too many login attempts. Please wait a few minutes and try again.',
      code: 'RATE_LIMITED',
    },
  },
})

router.post('/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = vendorLoginSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Enter your email or username and password.',
          code: 'VALIDATION_ERROR',
        },
      })
    }

    const result = await authenticateVendor({
      identifier: parsed.data.identifier,
      password: parsed.data.password,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    })

    if (!result) {
      return res.status(401).json({
        error: {
          message: 'Invalid email/username or password.',
          code: 'INVALID_CREDENTIALS',
        },
      })
    }

    res.cookie(VENDOR_COOKIE_NAME, result.rawToken, vendorCookieOptions())
    res.cookie(
      VENDOR_CSRF_COOKIE_NAME,
      generateVendorCsrfToken(),
      vendorCsrfCookieOptions(),
    )
    res.set('Cache-Control', 'no-store')
    return res.json({
      vendor: result.vendor,
      expiresAt: result.expiresAt,
    })
  } catch (error) {
    return next(error)
  }
})

router.get(
  '/auth/me',
  loadVendorSession,
  requireVendor,
  (req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json({ vendor: safeVendor(req.vendor) })
  },
)

router.post(
  '/auth/logout',
  loadVendorSession,
  requireVendor,
  requireVendorCsrf,
  async (req, res, next) => {
    try {
      const rawToken = req.cookies?.[VENDOR_COOKIE_NAME]

      if (rawToken) {
        await prisma.vendorSession.deleteMany({
          where: { tokenHash: hashVendorSessionToken(rawToken) },
        })
      }

      res.clearCookie(VENDOR_COOKIE_NAME, vendorClearCookieOptions())
      res.clearCookie(
        VENDOR_CSRF_COOKIE_NAME,
        vendorCsrfClearCookieOptions(),
      )
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/dashboard',
  loadVendorSession,
  requireVendor,
  async (req, res, next) => {
    try {
      const dashboard = await getVendorDashboard()

      res.set('Cache-Control', 'no-store')
      res.json({ ...dashboard, vendor: safeVendor(req.vendor) })
    } catch (error) {
      next(error)
    }
  },
)

router.patch(
  '/orders/:orderId/status',
  loadVendorSession,
  requireVendor,
  requireVendorCsrf,
  async (req, res, next) => {
    try {
      const parsedOrderId = vendorOrderIdSchema.safeParse(req.params.orderId)
      const parsedBody = vendorOrderActionSchema.safeParse(req.body)

      if (!parsedOrderId.success || !parsedBody.success) {
        throw new AppError('Please check the order action and try again.', {
          status: 400,
          code: 'VALIDATION_ERROR',
        })
      }

      const order = await performVendorOrderAction({
        orderId: parsedOrderId.data,
        action: parsedBody.data.action,
        note: parsedBody.data.note,
      })

      notifyOrderUpdated({
        orderId: order.id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
      })
      notifyVendorOrdersChanged()
      void notifyQueueChanged(order.queueDate)

      res.set('Cache-Control', 'no-store')
      res.json({ order })
    } catch (error) {
      next(error)
    }
  },
)

router.patch(
  '/orders/:orderId/payment',
  loadVendorSession,
  requireVendor,
  requireVendorCsrf,
  async (req, res, next) => {
    try {
      const parsedOrderId = vendorOrderIdSchema.safeParse(req.params.orderId)
      const parsedBody = vendorPaymentUpdateSchema.safeParse(req.body)

      if (!parsedOrderId.success || !parsedBody.success) {
        throw new AppError('Please check the payment update and try again.', {
          status: 400,
          code: 'VALIDATION_ERROR',
        })
      }

      const order = await updateVendorPaymentStatus({
        orderId: parsedOrderId.data,
        status: parsedBody.data.status,
        note: parsedBody.data.note,
        vendorId: req.vendor.id,
      })

      notifyOrderUpdated({
        orderId: order.id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
      })
      notifyVendorOrdersChanged()

      res.set('Cache-Control', 'no-store')
      res.json({ order })
    } catch (error) {
      next(error)
    }
  },
)

export default router
