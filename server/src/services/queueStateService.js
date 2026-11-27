import { prisma } from '../lib/prisma.js'

// Only queue numbers are exposed here. Customer names and phone numbers are
// intentionally excluded from public live queue updates.
export async function getPublicQueueState(queueDate) {
  const [preparingOrders, nextEligibleOrder, waitingCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        queueDate,
        orderStatus: 'PREPARING',
      },
      orderBy: { queueNumber: 'asc' },
      select: { queueNumber: true },
    }),
    prisma.order.findFirst({
      where: {
        queueDate,
        orderStatus: 'WAITING',
      },
      orderBy: { queueNumber: 'asc' },
      select: { queueNumber: true },
    }),
    prisma.order.count({
      where: {
        queueDate,
        orderStatus: 'WAITING',
      },
    }),
  ])

  return {
    queueDate,
    preparingQueueNumbers: preparingOrders.map((order) => order.queueNumber),
    nextEligibleQueueNumber: nextEligibleOrder?.queueNumber ?? null,
    waitingCount,
    updatedAt: new Date().toISOString(),
  }
}
