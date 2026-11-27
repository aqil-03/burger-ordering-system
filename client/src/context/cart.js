import { createContext, useContext } from 'react'

export const MAX_CART_ITEM_QUANTITY = 20
export const MAX_INSTRUCTIONS_LENGTH = 150

export const CartContext = createContext(null)

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used inside a CartProvider.')
  }

  return context
}
