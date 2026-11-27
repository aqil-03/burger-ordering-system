import { createContext, useContext } from 'react'

export const CheckoutContext = createContext(null)

export function useCheckout() {
  const context = useContext(CheckoutContext)

  if (!context) {
    throw new Error('useCheckout must be used inside a CheckoutProvider.')
  }

  return context
}
