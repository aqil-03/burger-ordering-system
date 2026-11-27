import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// GET /api/health
// This endpoint proves that Express can read from the SQLite database.
router.get('/', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    const menuItemCount = await prisma.menuItem.count({
      where: { deletedAt: null },
    })

    res.json({
      status: 'ok',
      service: 'burger-ordering-api',
      stage: 12,
      database: 'connected',
      menuItemCount,
      serverTime: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

export default router
