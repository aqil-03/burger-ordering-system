import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../../api/orders'
import { PAYMENT_METHOD_LABELS } from '../../constants/payment'
import { useCart } from '../../context/cart'
import { useCheckout } from '../../context/checkout'
import { formatRinggit } from '../../utils/formatCurrency'
import {
  clearOrderIdempotencyKey,
  getOrCreateOrderIdempotencyKey,
} from '../../utils/orderIdempotency'
import PaymentStatusBadge from '../shared/PaymentStatusBadge'

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  )
}

function paymentMessage(paymentMethod) {
  if (paymentMethod === 'DUITNOW') {
    return 'DuitNow payments stay Pending Verification until the vendor confirms receipt. No card or banking credentials are collected here.'
  }

  if (paymentMethod === 'ONLINE_BANKING') {
    return 'This is a demo online-banking choice. No real payment will be taken, and the order will start as Pending Verification.'
  }

  if (paymentMethod === 'CASH') {
    return 'The order will start as Pending Payment. Pay cash at the counter when you collect.'
  }

  return 'Choose a payment method above to continue.'
}

export default function PlaceOrderPanel({
  cartItems,
  customer,
  paymentMethod,
  paymentOption,
  totalSen,
  canPlaceOrder,
  disabledMessage,
  onOrderConflict,
}) {
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const { clearCheckout } = useCheckout()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  async function handlePlaceOrder() {
    if (!canPlaceOrder || submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setError('')

    try {
      const idempotencyKey = getOrCreateOrderIdempotencyKey()
      const result = await createOrder({
        customer: {
          name: customer.name,
          phone: customer.phone,
        },
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        })),
        paymentMethod,
        idempotencyKey,
      })

      clearOrderIdempotencyKey()
      clearCart()
      clearCheckout()
      navigate(`/order/${encodeURIComponent(result.order.trackingToken)}`, {
        replace: true,
      })
    } catch (requestError) {
      setError(
        requestError.message ||
          'The order could not be placed. Please try again.',
      )

      if (requestError.code === 'ITEM_UNAVAILABLE' && onOrderConflict) {
        onOrderConflict()
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="place-order-heading"
      className="mt-6 overflow-hidden rounded-[1.75rem] bg-ink-900 p-5 text-cream-50 shadow-2xl shadow-ink-900/15 sm:p-7 lg:p-8"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            Final step
          </p>
          <h2
            id="place-order-heading"
            className="mt-2 font-display text-3xl font-semibold tracking-tight"
          >
            Ready to place your order?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-cream-200/60">
            The server will verify availability, recalculate every price, and
            assign your queue number. You will receive it immediately.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cream-200/70">
              {PAYMENT_METHOD_LABELS[paymentMethod] || 'No payment selected'}
            </span>
            {paymentOption?.statusPreview && (
              <PaymentStatusBadge status={paymentOption.statusPreview} />
            )}
            {paymentOption?.isDemo && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-cream-200/70">
                Demo
              </span>
            )}
          </div>

          <p className="mt-4 max-w-xl text-xs leading-5 text-cream-200/50">
            {paymentMessage(paymentMethod)}
          </p>

          {disabledMessage && (
            <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2.5 text-xs leading-5 text-amber-100">
              {disabledMessage}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-xs text-cream-200/60">Total</p>
            <p className="font-display text-3xl font-semibold tracking-tight">
              {formatRinggit(totalSen)}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!canPlaceOrder || submitting}
            aria-busy={submitting}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-cream-200/40"
          >
            {submitting ? (
              <>
                <SpinnerIcon />
                Placing your order…
              </>
            ) : (
              'Place order'
            )}
          </button>

          <p className="mt-3 text-center text-[10px] leading-4 text-cream-200/35">
            No real online payment is taken in this build. Payment statuses
            remain Pending until the vendor verifies them.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-300/20 bg-red-500/15 px-3 py-2.5 text-xs leading-5 text-red-100"
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
