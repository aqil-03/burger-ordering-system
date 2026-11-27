import express, { Router } from 'express'
import {
  loadVendorSession,
  requireVendor,
  requireVendorCsrf,
} from '../middleware/vendorAuth.js'
import { vendorUploadLimiter } from '../middleware/rateLimiters.js'
import { saveUploadedImage } from '../services/imageService.js'
import { AppError } from '../utils/AppError.js'
import { vendorUploadKindSchema } from '../validators/vendorSchemas.js'

const router = Router()

router.use(loadVendorSession, requireVendor, requireVendorCsrf)

const readImageBody = express.raw({
  type: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  limit: '5mb',
})

router.post(
  '/:kind',
  vendorUploadLimiter,
  readImageBody,
  async (req, res, next) => {
    try {
      const parsedKind = vendorUploadKindSchema.safeParse(req.params.kind)

      if (!parsedKind.success) {
        throw new AppError('Choose a valid image upload type.', {
          status: 400,
          code: 'INVALID_UPLOAD_TYPE',
        })
      }

      if (!Buffer.isBuffer(req.body)) {
        throw new AppError('Upload a JPEG, PNG, or WebP image.', {
          status: 415,
          code: 'UNSUPPORTED_IMAGE_TYPE',
        })
      }

      const imageUrl = await saveUploadedImage({
        kind: parsedKind.data,
        buffer: req.body,
      })

      res.set('Cache-Control', 'no-store')
      res.status(201).json({
        imageUrl,
        kind: parsedKind.data,
      })
    } catch (error) {
      next(error)
    }
  },
)

export default router
