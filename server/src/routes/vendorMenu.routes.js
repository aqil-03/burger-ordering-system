import { Router } from 'express'
import {
  loadVendorSession,
  requireVendor,
  requireVendorCsrf,
} from '../middleware/vendorAuth.js'
import {
  createVendorMenuItem,
  deleteVendorMenuItem,
  getVendorMenu,
  moveVendorMenuItem,
  updateVendorMenuItem,
} from '../services/menuManagementService.js'
import { AppError } from '../utils/AppError.js'
import {
  vendorMenuItemIdSchema,
  vendorMenuItemInputSchema,
  vendorMenuItemUpdateSchema,
  vendorMenuPositionSchema,
} from '../validators/vendorSchemas.js'

const router = Router()

router.use(loadVendorSession, requireVendor, requireVendorCsrf)

function validationError(message) {
  return new AppError(message, {
    status: 400,
    code: 'VALIDATION_ERROR',
  })
}

router.get('/', async (req, res, next) => {
  try {
    const menu = await getVendorMenu()

    res.set('Cache-Control', 'no-store')
    res.json(menu)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const parsed = vendorMenuItemInputSchema.safeParse(req.body)

    if (!parsed.success) {
      throw validationError(
        'Please check the menu item name, description, price and photo.',
      )
    }

    const menu = await createVendorMenuItem(parsed.data)

    res.set('Cache-Control', 'no-store')
    res.status(201).json(menu)
  } catch (error) {
    next(error)
  }
})

router.patch('/:itemId/position', async (req, res, next) => {
  try {
    const parsedItemId = vendorMenuItemIdSchema.safeParse(req.params.itemId)
    const parsedBody = vendorMenuPositionSchema.safeParse(req.body)

    if (!parsedItemId.success || !parsedBody.success) {
      throw validationError('Choose a valid menu position change.')
    }

    const menu = await moveVendorMenuItem(
      parsedItemId.data,
      parsedBody.data.direction,
    )

    res.set('Cache-Control', 'no-store')
    res.json(menu)
  } catch (error) {
    next(error)
  }
})

router.patch('/:itemId', async (req, res, next) => {
  try {
    const parsedItemId = vendorMenuItemIdSchema.safeParse(req.params.itemId)
    const parsedBody = vendorMenuItemUpdateSchema.safeParse(req.body)

    if (!parsedItemId.success || !parsedBody.success) {
      throw validationError(
        'Please check the menu item name, description, price and photo.',
      )
    }

    const menu = await updateVendorMenuItem(
      parsedItemId.data,
      parsedBody.data,
    )

    res.set('Cache-Control', 'no-store')
    res.json(menu)
  } catch (error) {
    next(error)
  }
})

router.delete('/:itemId', async (req, res, next) => {
  try {
    const parsedItemId = vendorMenuItemIdSchema.safeParse(req.params.itemId)

    if (!parsedItemId.success) {
      throw validationError('Choose a valid menu item to delete.')
    }

    const menu = await deleteVendorMenuItem(parsedItemId.data)

    res.set('Cache-Control', 'no-store')
    res.json(menu)
  } catch (error) {
    next(error)
  }
})

export default router
