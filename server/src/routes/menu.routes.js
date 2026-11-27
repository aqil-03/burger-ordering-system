import { Router } from 'express'
import { getPublicMenu } from '../services/menuService.js'

const router = Router()

// GET /api/menu
// Public read-only menu. Availability must be fresh so customers do not see
// a stale "available" state after the vendor marks an item as sold out.
router.get('/', async (req, res, next) => {
  try {
    const menu = await getPublicMenu()

    res.set('Cache-Control', 'no-store')
    res.json(menu)
  } catch (error) {
    next(error)
  }
})

export default router
