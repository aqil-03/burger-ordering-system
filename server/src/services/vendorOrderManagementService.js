import { prisma } from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { withOrderWriteLock } from '../utils/orderWriteLock.js'

const ACTIVE_ORDER_STATUSES = ['WAITING', 'PREPARING', 'READY']
const PENDING_PAYMENT_STATUSES = ['PENDING_VERIFICATION', 'PENDING_PAYMENT']

export async function performVendorOrderAction({ orderId, action, note }) {
  return withOrderWriteLock(async () => {
    const setting = await prisma.setting.findUnique({
      where: { id: 'default' },
      select: { maxPreparing: true },
    })
    const maxPreparing = Math.max(1, setting?.maxPreparing ?? 1)

    return prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({
        where: { id: orderId },
      })

      if (!order) {
        throw new AppError('Order not found.', {
          status: 404,
          code: 'ORDER_NOT_FOUND',
        })
      }

      const now = new Date()
      let data

      if (action === 'ACCEPT') {
        if (order.orderStatus !== 'WAITING') {
          throw new AppError('Only a waiting order can be accepted.', {
            status: 409,
            code: 'INVALID_ORDER_STATE',
          })
        }

        if (order.acceptedAt) {
          throw new AppError('This order has already been accepted.', {
            status: 409,
            code: 'ALREADY_ACCEPTED',
          })
        }

        data = { acceptedAt: now }
      } else if (action === 'START_PREPARING') {
        if (order.orderStatus !== 'WAITING') {
          throw new AppError('Only a waiting order can start preparation.', {
            status: 409,
            code: 'INVALID_ORDER_STATE',
          })
        }

        if (!order.acceptedAt) {
          throw new AppError('Accept the order before starting preparation.', {
            status: 409,
            code: 'ORDER_NOT_ACCEPTED',
          })
        }

        const preparingCount = await transaction.order.count({
          where: { orderStatus: 'PREPARING' },
        })

        if (preparingCount >= maxPreparing) {
          throw new AppError(
            'Another order is already being prepared. Finish it before starting this one.',
            {
              status: 409,
              code: 'PREPARATION_LIMIT',
            },
          )
        }

        data = {
          orderStatus: 'PREPARING',
          preparingAt: now,
          acceptedAt: order.acceptedAt,
        }
      } else if (action === 'FINISH_PREPARING') {
        if (order.orderStatus !== 'PREPARING') {
          throw new AppError('Only an order being prepared can be finished.', {
            status: 409,
            code: 'INVALID_ORDER_STATE',
          })
        }

        data = {
          orderStatus: 'READY',
          readyAt: now,
        }
      } else if (action === 'COMPLETE') {
        if (order.orderStatus !== 'READY') {
          throw new AppError(
            'Only a ready order can be marked as completed.',
            {
              status: 409,
              code: 'INVALID_ORDER_STATE',
            },
          )
        }

        data = {
          orderStatus: 'COMPLETED',
          completedAt: now,
        }
      } else if (action === 'CANCEL') {
        if (!ACTIVE_ORDER_STATUSES.includes(order.orderStatus)) {
          throw new AppError('This order can no longer be cancelled.', {
            status: 409,
            code: 'INVALID_ORDER_STATE',
          })
        }

        data = {
          orderStatus: 'CANCELLED',
          cancelledAt: now,
          cancellationNote: String(note ?? '').trim() || null,
        }
      } else {
        throw new AppError('Unsupported order action.', {
          status: 400,
          code: 'INVALID_ORDER_ACTION',
        })
      }

      const updatedOrder = await transaction.order.update({
        where: { id: order.id },
        data,
      })

      return {
        id: updatedOrder.id,
        trackingToken: updatedOrder.trackingToken,
        queueDate: updatedOrder.queueDate,
        queueNumber: updatedOrder.queueNumber,
        orderStatus: updatedOrder.orderStatus,
        paymentStatus: updatedOrder.paymentStatus,
        acceptedAt: updatedOrder.acceptedAt,
        preparingAt: updatedOrder.preparingAt,
        readyAt: updatedOrder.readyAt,
        completedAt: updatedOrder.completedAt,
        cancelledAt: updatedOrder.cancelledAt,
        cancellationNote: updatedOrder.cancellationNote,
      }
    })
  })
}

export async function updateVendorPaymentStatus({
  orderId,
  status,
  note,
  vendorId,
}) {
  return withOrderWriteLock(async () =>
    prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({
        where: { id: orderId },
        include: {
          paymentEvents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!order) {
        throw new AppError('Order not found.', {
          status: 404,
          code: 'ORDER_NOT_FOUND',
        })
      }

      const currentStatus = order.paymentStatus
      const latestEvent = order.paymentEvents?.[0] ?? null
      const isPending = PENDING_PAYMENT_STATUSES.includes(currentStatus)

      if (status === 'PAID') {
        if (!isPending) {
          throw new AppError(
            'Only a pending payment can be marked as paid.',
            {
              status: 409,
              code: 'INVALID_PAYMENT_STATE',
            },
          )
        }

        if (latestEvent?.provider === 'DEMO_ONLINE_BANKING') {
          throw new AppError(
            'Demo online-banking payments cannot be marked as paid because no real payment was taken.',
            {
              status: 409,
              code: 'DEMO_PAYMENT_NOT_PAYABLE',
            },
          )
        }
      } else if (status === 'FAILED') {
        if (!isPending) {
          throw new AppError(
            'Only a pending payment can be marked as failed.',
            {
              status: 409,
              code: 'INVALID_PAYMENT_STATE',
            },
          )
        }
      } else if (status === 'REFUNDED') {
        if (currentStatus !== 'PAID') {
          throw new AppError(
            'Only a paid order can be marked as refunded.',
            {
              status: 409,
              code: 'INVALID_PAYMENT_STATE',
            },
          )
        }
      } else {
        throw new AppError('Unsupported payment status.', {
          status: 400,
          code: 'INVALID_PAYMENT_STATUS',
        })
      }

      const now = new Date()
      const defaultNote =
        status === 'PAID'
          ? 'Vendor confirmed the payment was received.'
          : status === 'FAILED'
            ? 'Vendor marked the payment as failed.'
            : 'Vendor marked the payment as refunded.'

      const paymentEvent = await transaction.paymentEvent.create({
        data: {
          orderId: order.id,
          method: order.paymentMethod,
          status,
          amountSen: order.totalSen,
          provider: latestEvent?.provider || 'MANUAL',
          note: String(note ?? '').trim() || defaultNote,
          verifiedById: vendorId,
          verifiedAt: now,
        },
      })

      const updatedOrder = await transaction.order.update({
        where: { id: order.id },
        data: { paymentStatus: status },
      })

      return {
        id: updatedOrder.id,
        trackingToken: updatedOrder.trackingToken,
        queueDate: updatedOrder.queueDate,
        queueNumber: updatedOrder.queueNumber,
        orderStatus: updatedOrder.orderStatus,
        paymentStatus: updatedOrder.paymentStatus,
        paymentEvent: {
          id: paymentEvent.id,
          status: paymentEvent.status,
          createdAt: paymentEvent.createdAt,
        },
      }
    }),
  )
}
