import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from '../constants/payment.js'
import { AppError } from '../utils/AppError.js'
import { validateCustomerDetails } from '../utils/customerValidation.js'
import {
  generateOrderReference,
  generateTrackingToken,
} from '../utils/orderIdentity.js'
import { getBusinessQueueDate } from '../utils/queue.js'
import { withOrderWriteLock } from '../utils/orderWriteLock.js'

const MAX_ORDER_ATTEMPTS = 6
const MAX_TOTAL_QUANTITY = 100

const PAYMENT_PROFILES = Object.freeze({
  [PAYMENT_METHOD.DUITNOW]: {
    status: PAYMENT_STATUS.PENDING_VERIFICATION,
    provider: 'DUITNOW_MANUAL',
    note: 'Awaiting manual vendor verification of the DuitNow payment.',
  },
  [PAYMENT_METHOD.ONLINE_BANKING]: {
    status: PAYMENT_STATUS.PENDING_VERIFICATION,
    provider: 'DEMO_ONLINE_BANKING',
    note: 'Demo online banking selection. No real payment was taken.',
  },
  [PAYMENT_METHOD.CASH]: {
    status: PAYMENT_STATUS.PENDING_PAYMENT,
    provider: 'CASH_AT_COUNTER',
    note: 'Customer will pay cash at the counter.',
  },
})

const orderInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
  },
  paymentEvents: {
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRetryableTransactionError(error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ['P2002', 'P2028', 'P2034'].includes(error.code)
  ) {
    return true
  }

  const message = String(error?.message ?? '')
  return /database is locked|database is busy|write conflict|transaction.*timed out/i.test(
    message,
  )
}

async function getRestaurantSettings() {
  const setting = await prisma.setting.findUnique({
    where: { id: 'default' },
    select: {
      restaurantName: true,
      logoUrl: true,
      queueResetHour: true,
      timezone: true,
    },
  })

  return {
    restaurantName: setting?.restaurantName || 'Burger House',
    logoUrl: setting?.logoUrl || null,
    queueResetHour: setting?.queueResetHour ?? 4,
    timezone: setting?.timezone || 'Asia/Kuala_Lumpur',
  }
}

function findOrderByIdempotencyKey(idempotencyKey) {
  return prisma.order.findUnique({
    where: { idempotencyKey },
    include: orderInclude,
  })
}

function findOrderByTrackingToken(trackingToken) {
  return prisma.order.findUnique({
    where: { trackingToken },
    include: orderInclude,
  })
}

function serializePublicOrder(order, settings) {
  const latestPaymentEvent = order.paymentEvents?.[0] ?? null

  return {
    orderRef: order.orderRef,
    trackingToken: order.trackingToken,
    queueNumber: order.queueNumber,
    queueDate: order.queueDate,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    totalSen: order.totalSen,
    createdAt: order.createdAt,
    paymentProvider: latestPaymentEvent?.provider ?? null,
    paymentIsDemo:
      latestPaymentEvent?.provider === 'DEMO_ONLINE_BANKING',
    items: order.items.map((item) => ({
      itemName: item.itemName,
      unitPriceSen: item.unitPriceSen,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions || null,
    })),
    restaurant: {
      name: settings.restaurantName,
      logoUrl: settings.logoUrl,
    },
  }
}

export async function createOrder(input) {
  const customerResult = validateCustomerDetails(input.customer)

  if (customerResult.errors.name || customerResult.errors.phone) {
    throw new AppError('Please check the customer name and mobile number.', {
      status: 400,
      code: 'INVALID_CUSTOMER',
    })
  }

  const itemIds = input.items.map((item) => item.menuItemId)
  const uniqueItemIds = new Set(itemIds)

  if (uniqueItemIds.size !== itemIds.length) {
    throw new AppError('Each menu item may only appear once in an order.', {
      status: 400,
      code: 'DUPLICATE_ITEMS',
    })
  }

  const requestedQuantity = input.items.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  if (requestedQuantity > MAX_TOTAL_QUANTITY) {
    throw new AppError('The order contains too many items.', {
      status: 400,
      code: 'CART_TOO_LARGE',
    })
  }

  const paymentProfile = PAYMENT_PROFILES[input.paymentMethod]

  if (!paymentProfile) {
    throw new AppError('Unsupported payment method.', {
      status: 400,
      code: 'INVALID_PAYMENT_METHOD',
    })
  }

  return withOrderWriteLock(async () => {
    const settings = await getRestaurantSettings()
    const existingOrder = await findOrderByIdempotencyKey(
      input.idempotencyKey,
    )

    if (existingOrder) {
      return {
        order: serializePublicOrder(existingOrder, settings),
        idempotent: true,
      }
    }

    const queueDate = getBusinessQueueDate({
      timeZone: settings.timezone,
      resetHour: settings.queueResetHour,
    })

    let lastError

    for (let attempt = 0; attempt < MAX_ORDER_ATTEMPTS; attempt += 1) {
      const orderRef = generateOrderReference(queueDate)
      const trackingToken = generateTrackingToken()

      try {
        const createdOrder = await prisma.$transaction(
          async (transaction) => {
            const menuItems = await transaction.menuItem.findMany({
              where: {
                id: { in: itemIds },
                deletedAt: null,
              },
              select: {
                id: true,
                name: true,
                priceSen: true,
                isAvailable: true,
              },
            })

            if (menuItems.length !== uniqueItemIds.size) {
              throw new AppError(
                'Some menu items are no longer available. Please refresh your cart.',
                { status: 409, code: 'ITEM_UNAVAILABLE' },
              )
            }

            const menuItemsById = new Map(
              menuItems.map((menuItem) => [menuItem.id, menuItem]),
            )

            const orderItems = input.items.map((item) => {
              const menuItem = menuItemsById.get(item.menuItemId)

              if (!menuItem || !menuItem.isAvailable) {
                throw new AppError(
                  'Some menu items are no longer available. Please refresh your cart.',
                  { status: 409, code: 'ITEM_UNAVAILABLE' },
                )
              }

              const instructions = String(
                item.specialInstructions ?? '',
              ).trim()

              return {
                menuItemId: menuItem.id,
                itemName: menuItem.name,
                unitPriceSen: menuItem.priceSen,
                quantity: item.quantity,
                specialInstructions: instructions || null,
              }
            })

            const totalSen = orderItems.reduce(
              (total, item) => total + item.unitPriceSen * item.quantity,
              0,
            )

            const queueCounter = await transaction.queueCounter.upsert({
              where: { queueDate },
              create: {
                queueDate,
                lastNumber: 1,
              },
              update: {
                lastNumber: { increment: 1 },
              },
              select: { lastNumber: true },
            })

            return transaction.order.create({
              data: {
                orderRef,
                trackingToken,
                queueDate,
                queueNumber: queueCounter.lastNumber,
                customerName: customerResult.values.name,
                customerPhone: customerResult.values.phone,
                totalSen,
                paymentMethod: input.paymentMethod,
                paymentStatus: paymentProfile.status,
                orderStatus: 'WAITING',
                idempotencyKey: input.idempotencyKey,
                items: {
                  create: orderItems,
                },
                paymentEvents: {
                  create: {
                    method: input.paymentMethod,
                    status: paymentProfile.status,
                    amountSen: totalSen,
                    provider: paymentProfile.provider,
                    note: paymentProfile.note,
                  },
                },
              },
              include: orderInclude,
            })
          },
          {
            maxWait: 5_000,
            timeout: 10_000,
          },
        )

        return {
          order: serializePublicOrder(createdOrder, settings),
          idempotent: false,
        }
      } catch (error) {
        lastError = error

        if (error instanceof AppError) {
          throw error
        }

        // Safety net if another process created the same idempotent order.
        const concurrentOrder = await findOrderByIdempotencyKey(
          input.idempotencyKey,
        )

        if (concurrentOrder) {
          return {
            order: serializePublicOrder(concurrentOrder, settings),
            idempotent: true,
          }
        }

        if (
          isRetryableTransactionError(error) &&
          attempt < MAX_ORDER_ATTEMPTS - 1
        ) {
          await sleep(60 * (attempt + 1))
          continue
        }

        break
      }
    }

    console.error('Order creation failed after retries:', lastError)

    throw new AppError(
      'We could not create your order right now. Please try again.',
      {
        status: 503,
        code: 'ORDER_CREATION_FAILED',
        cause: lastError,
      },
    )
  })
}

export async function getPublicOrderByTrackingToken(trackingToken) {
  const [order, settings] = await Promise.all([
    findOrderByTrackingToken(trackingToken),
    getRestaurantSettings(),
  ])

  if (!order) {
    throw new AppError('Order not found.', {
      status: 404,
      code: 'ORDER_NOT_FOUND',
    })
  }

  return serializePublicOrder(order, settings)
}
