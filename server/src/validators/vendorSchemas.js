import { z } from 'zod'

export const vendorLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
})

export const vendorOrderActionSchema = z.object({
  action: z.enum([
    'ACCEPT',
    'START_PREPARING',
    'FINISH_PREPARING',
    'COMPLETE',
    'CANCEL',
  ]),
  note: z.string().trim().max(250).optional().default(''),
})

export const vendorPaymentUpdateSchema = z.object({
  status: z.enum(['PAID', 'FAILED', 'REFUNDED']),
  note: z.string().trim().max(250).optional().default(''),
})

export const vendorOrderIdSchema = z.string().trim().min(1).max(100)

const MENU_IMAGE_PATH =
  /^\/(?:menu|uploads\/menu)\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/i
const PAYMENT_QR_PATH =
  /^(?:\/payment\/duitnow-demo\.svg|\/uploads\/payment\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp))$/i

export const vendorMenuItemInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(300),
  priceSen: z.number().int().min(1).max(1_000_000),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .regex(MENU_IMAGE_PATH)
    .nullable()
    .optional(),
  isAvailable: z.boolean().optional(),
})

export const vendorMenuItemUpdateSchema = vendorMenuItemInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0)

export const vendorMenuItemIdSchema = z.string().trim().min(1).max(100)

export const vendorMenuPositionSchema = z.object({
  direction: z.enum(['UP', 'DOWN']),
})

export const vendorMenuQrQuerySchema = z.object({
  url: z.string().trim().max(500).optional(),
})

export const vendorPaymentQrSchema = z.object({
  duitnowQrUrl: z.string().trim().max(500).regex(PAYMENT_QR_PATH),
  duitnowQrIsDemo: z.boolean(),
})

export const vendorUploadKindSchema = z.enum(['menu', 'payment'])
