import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Sample menu data for development. `update: {}` means running the seed again
// will not overwrite any menu changes made later in the vendor dashboard.
// Stage 3 adds local placeholder photographs and the restaurant logo.
const menuItems = [
  {
    id: 'burger-ayam',
    name: 'Burger Ayam',
    description:
      'Golden fried chicken, crisp lettuce, tomato, and house sauce in a toasted sesame bun.',
    priceSen: 1000,
    imageUrl: '/menu/burger-ayam.jpg',
    sortOrder: 1,
  },
  {
    id: 'burger-crispy',
    name: 'Burger Crispy',
    description:
      'Crispy chicken with pickles, fresh lettuce, and creamy sauce in a toasted bun.',
    priceSen: 2000,
    imageUrl: '/menu/burger-crispy.jpg',
    sortOrder: 2,
  },
  {
    id: 'burger-daging',
    name: 'Burger Daging',
    description:
      'Flame-grilled beef patty, crisp lettuce, tomato, onion, and our signature sauce.',
    priceSen: 1500,
    imageUrl: '/menu/burger-daging.jpg',
    sortOrder: 3,
  },
  {
    id: 'burger-special',
    name: 'Burger Special',
    description:
      'Double beef, melted cheese, pickles, and our signature special sauce.',
    priceSen: 2500,
    imageUrl: '/menu/burger-special.jpg',
    sortOrder: 4,
  },
]

async function main() {
  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    })
  }

  await prisma.setting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      restaurantName: 'Burger House',
      logoUrl: '/brand-logo.svg',
      duitnowQrUrl: '/payment/duitnow-demo.svg',
      duitnowQrIsDemo: true,
      paymentNote:
        'DuitNow payments are verified manually by the vendor before they are marked Paid.',
    },
  })

  await seedVendor()

  const menuItemCount = await prisma.menuItem.count({
    where: { deletedAt: null },
  })

  console.log(`Seed complete. ${menuItemCount} menu items are ready.`)
}

async function seedVendor() {
  const name = process.env.VENDOR_NAME || 'Burger House Owner'
  const email = (process.env.VENDOR_EMAIL || 'owner@burgerhouse.local')
    .trim()
    .toLowerCase()
  const username = (process.env.VENDOR_USERNAME || 'owner')
    .trim()
    .toLowerCase()
  const password = process.env.VENDOR_PASSWORD || ''

  if (password.length < 8) {
    console.warn(
      'Vendor seed skipped: set VENDOR_PASSWORD (at least 8 characters) in server/.env.',
    )
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('VENDOR_EMAIL must be a valid email address.')
  }

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new Error(
      'VENDOR_USERNAME must be 3-40 characters using letters, numbers, dots, underscores or hyphens.',
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const existingVendor = await prisma.vendor.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  })

  const vendor = existingVendor
    ? await prisma.vendor.update({
        where: { id: existingVendor.id },
        data: {
          name,
          email,
          username,
          passwordHash,
          isActive: true,
        },
      })
    : await prisma.vendor.create({
        data: {
          name,
          email,
          username,
          passwordHash,
          role: 'OWNER',
        },
      })

  // Re-seeding changes the password, so invalidate all previous sessions.
  await prisma.vendorSession.deleteMany({
    where: { vendorId: vendor.id },
  })

  console.log(`Vendor account ready: username "${vendor.username}".`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
