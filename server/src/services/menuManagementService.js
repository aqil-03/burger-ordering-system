import { prisma } from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { removeUploadedImage } from './imageService.js'

const MENU_ITEM_SELECT = {
  id: true,
  name: true,
  description: true,
  priceSen: true,
  imageUrl: true,
  isAvailable: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
}

async function cleanupMenuImageIfUnused(imageUrl) {
  if (!imageUrl?.startsWith('/uploads/menu/')) return

  const references = await prisma.menuItem.count({
    where: {
      imageUrl,
      deletedAt: null,
    },
  })

  if (references === 0) {
    await removeUploadedImage(imageUrl)
  }
}

async function listItems() {
  const items = await prisma.menuItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: MENU_ITEM_SELECT,
  })

  return { items }
}

export async function getVendorMenu() {
  return listItems()
}

export async function createVendorMenuItem(input) {
  const highestSortOrder = await prisma.menuItem.aggregate({
    where: { deletedAt: null },
    _max: { sortOrder: true },
  })

  const item = await prisma.menuItem.create({
    data: {
      name: input.name,
      description: input.description,
      priceSen: input.priceSen,
      imageUrl: input.imageUrl ?? null,
      isAvailable: input.isAvailable ?? true,
      sortOrder: (highestSortOrder._max.sortOrder ?? 0) + 1,
    },
    select: MENU_ITEM_SELECT,
  })

  return {
    ...(await listItems()),
    item,
  }
}

export async function updateVendorMenuItem(itemId, input) {
  const existing = await prisma.menuItem.findFirst({
    where: { id: itemId, deletedAt: null },
    select: MENU_ITEM_SELECT,
  })

  if (!existing) {
    throw new AppError('That menu item could not be found.', {
      status: 404,
      code: 'MENU_ITEM_NOT_FOUND',
    })
  }

  const data = {}

  for (const field of [
    'name',
    'description',
    'priceSen',
    'imageUrl',
    'isAvailable',
  ]) {
    if (input[field] !== undefined) {
      data[field] = input[field]
    }
  }

  const item = await prisma.menuItem.update({
    where: { id: existing.id },
    data,
    select: MENU_ITEM_SELECT,
  })

  if (existing.imageUrl !== item.imageUrl) {
    await cleanupMenuImageIfUnused(existing.imageUrl)
  }

  return {
    ...(await listItems()),
    item,
  }
}

export async function deleteVendorMenuItem(itemId) {
  const existing = await prisma.menuItem.findFirst({
    where: { id: itemId, deletedAt: null },
    select: MENU_ITEM_SELECT,
  })

  if (!existing) {
    throw new AppError('That menu item could not be found.', {
      status: 404,
      code: 'MENU_ITEM_NOT_FOUND',
    })
  }

  await prisma.menuItem.update({
    where: { id: existing.id },
    data: {
      isAvailable: false,
      deletedAt: new Date(),
    },
  })

  await cleanupMenuImageIfUnused(existing.imageUrl)

  return listItems()
}

export async function moveVendorMenuItem(itemId, direction) {
  const items = await prisma.menuItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: MENU_ITEM_SELECT,
  })

  const currentIndex = items.findIndex((item) => item.id === itemId)

  if (currentIndex === -1) {
    throw new AppError('That menu item could not be found.', {
      status: 404,
      code: 'MENU_ITEM_NOT_FOUND',
    })
  }

  const targetIndex =
    direction === 'UP' ? currentIndex - 1 : currentIndex + 1

  if (targetIndex < 0 || targetIndex >= items.length) {
    throw new AppError(
      direction === 'UP'
        ? 'This item is already first on the menu.'
        : 'This item is already last on the menu.',
      {
        status: 400,
        code: 'MENU_POSITION_BOUNDARY',
      },
    )
  }

  const reordered = [...items]
  const [movedItem] = reordered.splice(currentIndex, 1)
  reordered.splice(targetIndex, 0, movedItem)

  await prisma.$transaction(
    reordered.map((item, index) =>
      prisma.menuItem.update({
        where: { id: item.id },
        data: { sortOrder: index + 1 },
      }),
    ),
  )

  return listItems()
}
