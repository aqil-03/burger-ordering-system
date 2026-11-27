import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import checkoutRouter from './routes/checkout.routes.js'
import healthRouter from './routes/health.routes.js'
import menuRouter from './routes/menu.routes.js'
import ordersRouter from './routes/orders.routes.js'
import vendorMenuRouter from './routes/vendorMenu.routes.js'
import vendorQrRouter from './routes/vendorQr.routes.js'
import vendorRouter from './routes/vendor.routes.js'
import vendorSettingsRouter from './routes/vendorSettings.routes.js'
import vendorUploadRouter from './routes/vendorUpload.routes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { redactSensitiveUrl } from './utils/redact.js'

const logFormat =
  env.nodeEnv === 'production'
    ? ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    : ':method :safe-url :status :response-time ms - :res[content-length]'

morgan.token('safe-url', (req) => redactSensitiveUrl(req.originalUrl))

export function createApp() {
  const app = express()

  // Do not advertise the server framework in response headers.
  app.disable('x-powered-by')

  // Sensitive JSON responses must not be cached or embedded in another site.
  app.set('etag', false)
  app.set('json escape', true)
  app.set('query parser', 'simple')
  app.set('trust proxy', env.trustProxy)

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  )

  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    )
    next()
  })

  // Log requests without exposing customer tracking tokens in terminal logs.
  app.use(morgan(logFormat))

  // JSON request bodies are limited to reduce abuse.
  app.use(express.json({ limit: '1mb', strict: true }))
  app.use(cookieParser())

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // Vendor-uploaded menu photos and payment QR images. Filenames are random,
  // so uploaded files can be cached aggressively.
  app.use(
    '/uploads',
    express.static(env.uploadsDir, {
      index: false,
      immutable: true,
      maxAge: '7d',
    }),
  )

  app.get('/api', (req, res) => {
    res.json({
      name: 'Burger Ordering API',
      status: 'running',
      health: '/api/health',
      menu: '/api/menu',
      paymentOptions: '/api/checkout/payment-options',
      orders: '/api/orders',
      vendorLogin: '/api/vendor/auth/login',
      vendorMenu: '/api/vendor/menu',
      vendorQrCode: '/api/vendor/qr/menu',
    })
  })

  app.use('/api/health', healthRouter)
  app.use('/api/menu', menuRouter)
  app.use('/api/checkout', checkoutRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/vendor/menu', vendorMenuRouter)
  app.use('/api/vendor/uploads', vendorUploadRouter)
  app.use('/api/vendor/qr', vendorQrRouter)
  app.use('/api/vendor/settings', vendorSettingsRouter)
  app.use('/api/vendor', vendorRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
