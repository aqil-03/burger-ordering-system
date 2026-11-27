import { Server } from 'socket.io'
import { parseCookie } from 'cookie'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'
import { findValidVendorSession } from '../services/vendorSessionService.js'
import { getPublicQueueState } from '../services/queueStateService.js'
import { VENDOR_COOKIE_NAME } from '../utils/vendorSession.js'

let io = null

function orderRoom(orderId) {
  return `order:${orderId}`
}

function queueRoom(queueDate) {
  return `queue:${queueDate}`
}

function safeOrderUpdate(order) {
  return {
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    queueNumber: order.queueNumber,
    queueDate: order.queueDate,
    updatedAt: new Date().toISOString(),
  }
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false
  }

  const [first, second] = parts

  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  )
}

function isDevelopmentHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') {
    return true
  }

  if (isPrivateIpv4(host)) return true

  return (
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80:')
  )
}

function isAllowedSocketOrigin(origin) {
  // Native clients and same-origin polling requests may omit Origin. Browsers
  // always include it on WebSocket handshakes, which is the CSRF-relevant path.
  if (!origin) return true

  let parsed

  try {
    parsed = new URL(origin)
  } catch {
    return false
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false

  try {
    if (parsed.origin === new URL(env.publicAppUrl).origin) {
      return true
    }
  } catch {
    // Invalid PUBLIC_APP_URL is handled by deployment checks.
  }

  if (env.nodeEnv === 'production') return false

  return isDevelopmentHost(parsed.hostname)
}

export function initializeSocketServer(httpServer) {
  if (io) return io

  io = new Server(httpServer, {
    serveClient: false,
    path: '/socket.io',
    allowRequest: (request, callback) => {
      callback(null, isAllowedSocketOrigin(request.headers.origin))
    },
  })

  const trackingNamespace = io.of('/tracking')

  trackingNamespace.on('connection', (socket) => {
    socket.on('track:order', async (payload, acknowledge) => {
      try {
        const trackingToken =
          typeof payload?.trackingToken === 'string'
            ? payload.trackingToken.trim()
            : ''

        if (trackingToken.length < 20 || trackingToken.length > 200) {
          acknowledge?.({ ok: false, error: 'INVALID_TOKEN' })
          return
        }

        const order = await prisma.order.findUnique({
          where: { trackingToken },
          select: {
            id: true,
            queueDate: true,
            queueNumber: true,
            orderStatus: true,
            paymentStatus: true,
          },
        })

        if (!order) {
          acknowledge?.({ ok: false, error: 'ORDER_NOT_FOUND' })
          return
        }

        socket.join(orderRoom(order.id))
        socket.join(queueRoom(order.queueDate))
        socket.data.orderId = order.id

        const queueState = await getPublicQueueState(order.queueDate)
        socket.emit('order:updated', safeOrderUpdate(order))
        socket.emit('queue:updated', queueState)
        acknowledge?.({ ok: true })
      } catch (error) {
        console.error('Socket tracking subscription failed:', error)
        acknowledge?.({ ok: false, error: 'SERVER_ERROR' })
      }
    })
  })

  const vendorNamespace = io.of('/vendor')

  vendorNamespace.use(async (socket, next) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie || '')
      const session = await findValidVendorSession(
        cookies[VENDOR_COOKIE_NAME],
      )

      if (!session) {
        next(new Error('unauthorized'))
        return
      }

      socket.data.vendorId = session.vendor.id
      next()
    } catch (error) {
      console.error('Vendor socket authentication failed:', error)
      next(new Error('unauthorized'))
    }
  })

  vendorNamespace.on('connection', (socket) => {
    socket.join('vendor-updates')
  })

  return io
}

export function notifyVendorOrdersChanged() {
  io?.of('/vendor').emit('orders:changed')
}

export function notifyOrderUpdated({
  orderId,
  orderStatus,
  paymentStatus,
}) {
  io?.of('/tracking').to(orderRoom(orderId)).emit('order:updated', {
    orderStatus,
    paymentStatus,
    updatedAt: new Date().toISOString(),
  })
}

export async function notifyQueueChanged(queueDate) {
  if (!io) return

  try {
    const queueState = await getPublicQueueState(queueDate)
    io.of('/tracking')
      .to(queueRoom(queueDate))
      .emit('queue:updated', queueState)
  } catch (error) {
    console.error('Failed to broadcast queue update:', error)
  }
}

export function closeSocketServer() {
  if (!io) return
  io.close()
  io = null
}
