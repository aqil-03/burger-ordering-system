import { prisma } from '../lib/prisma.js'

// Only expose fields that are safe and necessary for the public menu.
// Customer names, phone numbers, payment data, and vendor data never belong here.
export async function getPublicMenu() {
  const [setting, items] = await Promise.all([
    prisma.setting.findUnique({
      where: { id: 'default' },
      select: {
        restaurantName: true,
        logoUrl: true,
      },
    }),
    prisma.menuItem.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        priceSen: true,
        imageUrl: true,
        isAvailable: true,
      },
    }),
  ])

  return {
    restaurant: {
      name: setting?.restaurantName || 'Burger House',
      logoUrl: setting?.logoUrl || null,
    },
    currency: 'MYR',
    items,
  }
}
