import { useCallback, useEffect, useMemo, useState } from 'react'
import { PAYMENT_METHOD_IDS } from '../constants/payment'
import { CheckoutContext } from './checkout'

const CHECKOUT_STORAGE_KEY = 'burger-house.checkout.v1'

function readCheckoutDraft() {
  if (typeof window === 'undefined') {
    return { customer: null, paymentMethod: '' }
  }

  try {
    const storedValue = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY)
    if (!storedValue) return { customer: null, paymentMethod: '' }

    const parsedValue = JSON.parse(storedValue)
    const storedCustomer = parsedValue?.customer
    const customer =
      storedCustomer &&
      typeof storedCustomer.name === 'string' &&
      typeof storedCustomer.phone === 'string' &&
      storedCustomer.name.trim() &&
      storedCustomer.phone.trim()
        ? {
            name: storedCustomer.name.trim(),
            phone: storedCustomer.phone.trim(),
          }
        : null

    const paymentMethod = PAYMENT_METHOD_IDS.includes(parsedValue?.paymentMethod)
      ? parsedValue.paymentMethod
      : ''

    return { customer, paymentMethod }
  } catch {
    return { customer: null, paymentMethod: '' }
  }
}

export function CheckoutProvider({ children }) {
  const initialDraft = readCheckoutDraft()
  const [customer, setCustomer] = useState(initialDraft.customer)
  const [paymentMethod, setPaymentMethod] = useState(initialDraft.paymentMethod)

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        CHECKOUT_STORAGE_KEY,
        JSON.stringify({ customer, paymentMethod }),
      )
    } catch {
      // Checkout still works in memory if session storage is unavailable.
    }
  }, [customer, paymentMethod])

  const saveCustomer = useCallback((details) => {
    setCustomer({
      name: String(details.name ?? '').trim(),
      phone: String(details.phone ?? '').trim(),
    })
  }, [])

  const clearCustomer = useCallback(() => {
    setCustomer(null)
  }, [])

  const selectPaymentMethod = useCallback((method) => {
    if (!PAYMENT_METHOD_IDS.includes(method)) return
    setPaymentMethod(method)
  }, [])

  const clearCheckout = useCallback(() => {
    setCustomer(null)
    setPaymentMethod('')
  }, [])

  const value = useMemo(
    () => ({
      customer,
      paymentMethod,
      saveCustomer,
      clearCustomer,
      selectPaymentMethod,
      clearCheckout,
    }),
    [
      customer,
      paymentMethod,
      saveCustomer,
      clearCustomer,
      selectPaymentMethod,
      clearCheckout,
    ],
  )

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  )
}
