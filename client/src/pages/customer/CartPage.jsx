import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import CartLineItem from '../../components/customer/CartLineItem'
import CustomerDetailsForm from '../../components/customer/CustomerDetailsForm'
import OrderSummary from '../../components/customer/OrderSummary'
import PaymentMethodSelector from '../../components/customer/PaymentMethodSelector'
import PlaceOrderPanel from '../../components/customer/PlaceOrderPanel'
import SiteFooter from '../../components/customer/SiteFooter'
import SiteHeader from '../../components/customer/SiteHeader'
import { BurgerIcon } from '../../components/customer/BurgerIcon'
import { useCart } from '../../context/cart'
import { useCheckout } from '../../context/checkout'
import { useMenu } from '../../hooks/useMenu'
import { usePaymentOptions } from '../../hooks/usePaymentOptions'

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 10H4M9 5l-5 5 5 5" />
    </svg>
  )
}

function CartLoading() {
  return (
    <div
      className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
      aria-hidden="true"
    >
      <div className="space-y-4">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="rounded-[1.5rem] border border-cream-200 bg-white p-5"
          >
            <div className="flex gap-4">
              <div className="size-24 shrink-0 animate-pulse rounded-2xl bg-cream-100 sm:size-28" />
              <div className="flex-1 space-y-3">
                <div className="h-2.5 w-24 animate-pulse rounded-full bg-cream-100" />
                <div className="h-7 w-48 animate-pulse rounded-lg bg-cream-100" />
                <div className="h-3 w-32 animate-pulse rounded-full bg-cream-100" />
                <div className="h-10 w-32 animate-pulse rounded-full bg-cream-50" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-5">
        <div className="h-64 animate-pulse rounded-[1.5rem] border border-cream-200 bg-white" />
        <div className="h-80 animate-pulse rounded-[1.5rem] border border-cream-200 bg-white" />
      </div>
    </div>
  )
}

export default function CartPage() {
  const {
    items: cartItems,
    totalQuantity,
    updateQuantity,
    removeItem,
    setSpecialInstructions,
  } = useCart()
  const {
    restaurant,
    items: menuItems,
    loading,
    error,
    reload,
  } = useMenu()
  const { customer, paymentMethod } = useCheckout()
  const {
    options: paymentOptions,
    loading: paymentLoading,
    error: paymentError,
    reload: reloadPaymentOptions,
  } = usePaymentOptions()

  useEffect(() => {
    document.title = `Your cart · ${restaurant.name}`
  }, [restaurant.name])

  const menuItemsById = new Map(
    menuItems.map((menuItem) => [menuItem.id, menuItem]),
  )
  const lines = cartItems.map((cartItem) => ({
    ...cartItem,
    menuItem: menuItemsById.get(cartItem.menuItemId) ?? null,
  }))
  const availableLines = lines.filter(
    (line) => line.menuItem && line.menuItem.isAvailable,
  )
  const unavailableCount = lines.length - availableLines.length
  const subtotalSen = availableLines.reduce(
    (total, line) => total + line.menuItem.priceSen * line.quantity,
    0,
  )
  const canSaveDetails =
    lines.length > 0 &&
    !loading &&
    !error &&
    unavailableCount === 0
  const paymentDisabled = !canSaveDetails || !customer
  const paymentDisabledMessage =
    unavailableCount > 0
      ? 'Remove the unavailable items above before choosing a payment method.'
      : !customer
        ? 'Save your customer details above to choose a payment method.'
        : undefined
  const selectedPaymentOption = paymentOptions?.methods
    ? Object.values(paymentOptions.methods).find(
        (method) => method.id === paymentMethod && method.enabled,
      ) ?? null
    : null
  const canPlaceOrder =
    canSaveDetails && Boolean(customer) && Boolean(selectedPaymentOption)
  const placeOrderDisabledMessage =
    unavailableCount > 0
      ? 'Remove the unavailable items before placing your order.'
      : !customer
        ? 'Save your customer details before placing your order.'
        : !paymentMethod
          ? 'Choose a payment method before placing your order.'
          : !selectedPaymentOption
            ? 'Choose an available payment method before placing your order.'
            : undefined

  return (
    <div className="min-h-screen bg-cream-50">
      <SiteHeader
        restaurantName={restaurant.name}
        logoUrl={restaurant.logoUrl}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Link
          to="/#menu"
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-500 transition hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
        >
          <ArrowLeftIcon />
          Back to menu
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
              Your order
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Your cart.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ink-500">
              Review your burgers, adjust quantities, and add any special
              instructions before saving your details.
            </p>
          </div>

          {cartItems.length > 0 && (
            <span className="rounded-full border border-cream-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-600 shadow-sm">
              {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} in cart
            </span>
          )}
        </div>

        {cartItems.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-cream-200 bg-white px-6 py-14 text-center shadow-sm">
            <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-brand-50 text-brand-500">
              <BurgerIcon className="size-12" />
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900">
              Your cart is feeling light.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">
              Add a burger from the menu and it will appear here. Your cart is
              saved on this device.
            </p>
            <Link
              to="/#menu"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Browse the menu
            </Link>
          </section>
        ) : loading ? (
          <>
            <p role="status" className="sr-only">
              Loading your cart…
            </p>
            <CartLoading />
          </>
        ) : error ? (
          <div
            role="alert"
            className="mt-8 rounded-[1.5rem] border border-red-200 bg-red-50 p-6 sm:p-8"
          >
            <p className="font-display text-2xl font-semibold text-red-950">
              We couldn’t check your cart.
            </p>
            <p className="mt-2 text-sm leading-6 text-red-800">
              The latest menu prices and availability could not be loaded.
              Please try again.
            </p>
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 font-mono text-xs text-red-700 ring-1 ring-red-200">
              {error}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-red-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <section aria-label="Cart items" className="space-y-4">
                {lines.map((line) => (
                  <CartLineItem
                    key={line.menuItemId}
                    line={line}
                    onQuantityChange={updateQuantity}
                    onRemove={removeItem}
                    onInstructionsChange={setSpecialInstructions}
                  />
                ))}
              </section>

              <aside className="space-y-5">
                <OrderSummary
                  itemCount={totalQuantity}
                  subtotalSen={subtotalSen}
                  unavailableCount={unavailableCount}
                />
                <CustomerDetailsForm
                  disabled={!canSaveDetails}
                  disabledMessage={
                    unavailableCount > 0
                      ? 'Remove the unavailable items above before saving your details.'
                      : undefined
                  }
                />
              </aside>
            </div>

            <PaymentMethodSelector
              options={paymentOptions}
              loading={paymentLoading}
              error={paymentError}
              onRetry={reloadPaymentOptions}
              disabled={paymentDisabled}
              disabledMessage={paymentDisabledMessage}
            />

            <PlaceOrderPanel
              cartItems={cartItems}
              customer={customer}
              paymentMethod={paymentMethod}
              paymentOption={selectedPaymentOption}
              totalSen={subtotalSen}
              canPlaceOrder={canPlaceOrder}
              disabledMessage={placeOrderDisabledMessage}
              onOrderConflict={reload}
            />
          </>
        )}
      </main>

      <SiteFooter restaurantName={restaurant.name} />
    </div>
  )
}
