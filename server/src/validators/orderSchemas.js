import { z } from 'zod'
import { PAYMENT_METHOD } from '../constants/payment.js'

const orderItemSchema = z.object({
  menuItemId: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(20),
  specialInstructions: z.string().max(150).optional().default(''),
})

export const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(60),
    phone: z.string().min(1).max(24),
  }),
  items: z.array(orderItemSchema).min(1).max(50),
  paymentMethod: z.enum([
    PAYMENT_METHOD.DUITNOW,
    PAYMENT_METHOD.ONLINE_BANKING,
    PAYMENT_METHOD.CASH,
  ]),
  idempotencyKey: z.uuid(),
})

export const trackingTokenSchema = z.string().min(20).max(100)
