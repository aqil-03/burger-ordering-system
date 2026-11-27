import { prisma } from '../lib/prisma.js'
import { getBusinessQueueDate } from '../utils/queue.js'

const ACTIVE_ORDER_STATUSES = ['WAITING', 'PREPARING', 'READY']
const PENDING_PAYMENT_STATUSES = [
  'PENDING_VERIFICATION',
  'PENDING_PAYMENT',
]

function serializeVendorOrder(order) {
  const latestPaymentEvent = order.paymentEvents?.[0] ?? null

  return {
    id: order.id,
    orderRef: order.orderRef,
    queueNumber: order.queueNumber,
    queueDate: order.queueDate,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentProvider: latestPaymentEvent?.provider ?? null,
    totalSen: order.totalSen,
    createdAt: order.createdAt,
    acceptedAt: order.acceptedAt,
    preparingAt: order.preparingAt,
    readyAt: order.readyAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    cancellationNote: order.cancellationNote,
    items: order.items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      unitPriceSen: item.unitPriceSen,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions || null,
    })),
    paymentEvents: order.paymentEvents.map((event) => ({
      id: event.id,
      method: event.method,
      status: event.status,
      amountSen: event.amountSen,
      provider: event.provider,
      note: event.note,
      verifiedAt: event.verifiedAt,
      createdAt: event.createdAt,
      verifiedByName: event.verifiedBy?.name || null,
    })),
  }
}

export async function getVendorDashboard() {
  const setting = await prisma.setting.findUnique({
    where: { id: 'default' },
    select: {
      restaurantName: true,
      logoUrl: true,
      queueResetHour: true,
      timezone: true,
      maxPreparing: true,
    },
  })

  const queueDate = getBusinessQueueDate({
    timeZone: setting?.timezone || 'Asia/Kuala_Lumpur',
    resetHour: setting?.queueResetHour ?? 4,
  })

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { queueDate },
        {
          orderStatus: {
            in: ACTIVE_ORDER_STATUSES,
          },
        },
      ],
    },
    orderBy: [{ queueNumber: 'asc' }, { createdAt: 'asc' }],
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
      },
      paymentEvents: {
        orderBy: { createdAt: 'desc' },
        include: {
          verifiedBy: {
            select: { name: true },
          },
        },
      },
    },
  })

  const stats = {
    total: orders.length,
    waiting: orders.filter((order) => order.orderStatus === 'WAITING').length,
    preparing: orders.filter((order) => order.orderStatus === 'PREPARING')
      .length,
    ready: orders.filter((order) => order.orderStatus === 'READY').length,
    completed: orders.filter(
      (order) =>
        order.queueDate === queueDate && order.orderStatus === 'COMPLETED',
    ).length,
    cancelled: orders.filter(
      (order) =>
        order.queueDate === queueDate && order.orderStatus === 'CANCELLED',
    ).length,
    pendingPayments: orders.filter((order) =>
      PENDING_PAYMENT_STATUSES.includes(order.paymentStatus),
    ).length,
  }

  const nextEligibleOrder = orders
    .filter((order) => order.orderStatus === 'WAITING')
    .sort((first, second) => first.queueNumber - second.queueNumber)[0]

  return {
    restaurant: {
      name: setting?.restaurantName || 'Burger House',
      logoUrl: setting?.logoUrl || null,
    },
    queueDate,
    serverTime: new Date(),
    autoRefreshSeconds: 30,
    maxPreparing: Math.max(1, setting?.maxPreparing ?? 1),
    nextEligibleOrderId: nextEligibleOrder?.id ?? null,
    nextEligibleQueueNumber: nextEligibleOrder?.queueNumber ?? null,
    stats,
    orders: orders.map(serializeVendorOrder),
  }
}
