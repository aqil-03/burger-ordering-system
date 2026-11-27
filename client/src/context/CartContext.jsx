import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartContext,
  MAX_CART_ITEM_QUANTITY,
  MAX_INSTRUCTIONS_LENGTH,
} from './cart'

const MAX_CART_LINES = 50
const CART_STORAGE_KEY = 'burger-house.cart.v1'

function clampQuantity(value) {
  const quantity = Number(value)

  if (!Number.isInteger(quantity)) return 1

  return Math.min(Math.max(quantity, 1), MAX_CART_ITEM_QUANTITY)
}

function clampInstructions(value) {
  return typeof value === 'string'
    ? value.slice(0, MAX_INSTRUCTIONS_LENGTH)
    : ''
}

function readStoredCart() {
  if (typeof window === 'undefined') return []

  try {
    const storedValue = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!storedValue) return []

    const parsedValue = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue)) return []

    // Treat stored data as untrusted. Keep only the fields we expect and
    // never store prices in the cart, so the database remains the price source.
    const itemsById = new Map()

    for (const storedItem of parsedValue.slice(0, MAX_CART_LINES)) {
      if (!storedItem || typeof storedItem.menuItemId !== 'string') continue

      const menuItemId = storedItem.menuItemId.trim()
      if (!menuItemId) continue

      const quantity = clampQuantity(storedItem.quantity)
      const existingItem = itemsById.get(menuItemId)

      if (existingItem) {
        existingItem.quantity = Math.min(
          existingItem.quantity + quantity,
          MAX_CART_ITEM_QUANTITY,
        )
      } else {
        itemsById.set(menuItemId, {
          menuItemId,
          quantity,
          specialInstructions: clampInstructions(
            storedItem.specialInstructions,
          ),
        })
      }
    }

    return [...itemsById.values()]
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart)

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // The cart still works in memory if storage is blocked or full.
    }
  }, [items])

  const addItem = useCallback((menuItemId) => {
    if (typeof menuItemId !== 'string' || !menuItemId.trim()) return

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.menuItemId === menuItemId,
      )

      if (existingItem) {
        if (existingItem.quantity >= MAX_CART_ITEM_QUANTITY) {
          return currentItems
        }

        return currentItems.map((item) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      if (currentItems.length >= MAX_CART_LINES) return currentItems

      return [
        ...currentItems,
        {
          menuItemId,
          quantity: 1,
          specialInstructions: '',
        },
      ]
    })
  }, [])

  const updateQuantity = useCallback((menuItemId, quantity) => {
    const safeQuantity = clampQuantity(quantity)

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.menuItemId === menuItemId
          ? { ...item, quantity: safeQuantity }
          : item,
      ),
    )
  }, [])

  const removeItem = useCallback((menuItemId) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.menuItemId !== menuItemId),
    )
  }, [])

  const setSpecialInstructions = useCallback((menuItemId, instructions) => {
    const safeInstructions = clampInstructions(instructions)

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.menuItemId === menuItemId
          ? { ...item, specialInstructions: safeInstructions }
          : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalQuantity = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      totalQuantity,
      addItem,
      updateQuantity,
      removeItem,
      setSpecialInstructions,
      clearCart,
    }),
    [
      items,
      totalQuantity,
      addItem,
      updateQuantity,
      removeItem,
      setSpecialInstructions,
      clearCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
