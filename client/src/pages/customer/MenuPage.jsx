import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MAX_CART_ITEM_QUANTITY, useCart } from '../../context/cart'
import { useMenu } from '../../hooks/useMenu'
import { formatRinggit } from '../../utils/formatCurrency'
import MenuGridSkeleton from '../../components/customer/MenuGridSkeleton'
import MenuItemCard from '../../components/customer/MenuItemCard'
import SiteFooter from '../../components/customer/SiteFooter'
import SiteHeader from '../../components/customer/SiteHeader'

const howItWorksSteps = [
  {
    number: '01',
    title: 'Pick your burger',
    description: 'Browse the menu and choose your favourites.',
  },
  {
    number: '02',
    title: 'Pay your way',
    description: 'DuitNow, online banking, or cash at the counter.',
  },
  {
    number: '03',
    title: 'Follow your queue',
    description: 'Get a number and watch it move in real time.',
  },
]

function ArrowIcon() {
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
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 10 3.2 3.2L15 6.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  )
}

export default function MenuPage() {
  const { restaurant, items, loading, error, reload } = useMenu()
  const { items: cartItems, addItem } = useCart()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    document.title = `${restaurant.name} · Menu`
  }, [restaurant.name])

  useEffect(() => {
    if (!toast) return

    const timeout = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const availableCount = items.filter((item) => item.isAvailable).length
  const featuredItem =
    items.find((item) => item.id === 'burger-special') ?? items[0]

  function handleAddToCart(item) {
    const currentQuantity =
      cartItems.find((cartItem) => cartItem.menuItemId === item.id)
        ?.quantity ?? 0

    if (!item.isAvailable || currentQuantity >= MAX_CART_ITEM_QUANTITY) return

    addItem(item.id)
    setToast((currentToast) => ({
      name: item.name,
      nonce: (currentToast?.nonce ?? 0) + 1,
    }))
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <SiteHeader
        restaurantName={restaurant.name}
        logoUrl={restaurant.logoUrl}
      />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-100/70 via-cream-50 to-cream-50" />
          <div className="pointer-events-none absolute -right-32 top-16 size-[30rem] rounded-full border-[52px] border-white/50" />
          <div className="pointer-events-none absolute -left-40 bottom-0 size-96 rounded-full bg-brand-50/80 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cream-300/80 bg-white/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500 backdrop-blur">
                <span
                  className={`size-1.5 rounded-full ${
                    loading
                      ? 'animate-pulse bg-amber-500'
                      : error
                        ? 'bg-red-500'
                        : 'bg-leaf-700'
                  }`}
                />
                {loading
                  ? 'Preparing today’s menu'
                  : error
                    ? 'Menu check unavailable'
                    : `${availableCount} of ${items.length} burgers available`}
              </span>

              <h1 className="mt-5 max-w-2xl font-display text-[3.4rem] font-semibold leading-[0.95] tracking-[-0.04em] text-ink-900 sm:text-6xl lg:text-[4.6rem]">
                Big flavour.
                <br />
                <span className="text-brand-600">Short wait.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-ink-500 sm:text-lg sm:leading-8">
                Classic chicken and beef burgers, stacked with fresh
                ingredients and served hot. Browse the menu and find your next
                favourite.
              </p>

              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <a
                  href="#menu"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  Browse the menu
                  <ArrowIcon />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-1 py-1 text-sm font-semibold text-ink-700 underline decoration-cream-300 underline-offset-4 transition hover:text-brand-600"
                >
                  See how it works
                </a>
              </div>

              <p className="mt-7 text-xs text-ink-400">
                Chicken &amp; beef · Made to order · Prices in RM
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="pointer-events-none absolute inset-x-10 bottom-1 h-20 rounded-full bg-brand-500/20 blur-3xl" />
              <div className="relative aspect-square overflow-hidden rounded-[2.5rem] bg-cream-100 shadow-2xl shadow-ink-900/15">
                <img
                  src="/menu/burger-special.jpg"
                  alt="The Burger Special, stacked with beef, cheese and pickles"
                  fetchPriority="high"
                  className="size-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/20" />
              </div>

              <span className="absolute -right-2 top-5 grid size-20 rotate-6 place-items-center rounded-full bg-brand-500 px-3 text-center font-display text-[13px] font-semibold leading-4 text-white shadow-lg shadow-brand-500/25 sm:right-4 sm:size-24 sm:text-sm">
                Fresh off
                <br />
                the grill
              </span>

              <div className="absolute -bottom-4 left-4 rounded-2xl border border-cream-200 bg-white px-4 py-3 shadow-xl shadow-ink-900/10 sm:left-8">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  House favourite
                </p>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <p className="font-display text-lg font-semibold text-ink-900">
                    {featuredItem?.name ?? 'Burger Special'}
                  </p>
                  <p className="text-xs font-semibold text-ink-500">
                    {featuredItem
                      ? formatRinggit(featuredItem.priceSen)
                      : 'Made fresh'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="menu"
          className="scroll-mt-20 bg-cream-50/80 py-14 sm:py-16 lg:py-24"
          aria-busy={loading}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Our menu
                </p>
                <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                  Pick your favourite.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-ink-500 sm:text-base">
                  House burgers, made to order. Sold-out items stay visible so
                  you know what to look forward to.
                </p>
              </div>

              {!loading && !error && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cream-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-600 shadow-sm">
                  <span className="size-1.5 rounded-full bg-leaf-700" />
                  {items.length === 0
                    ? 'Menu being updated'
                    : `${availableCount} of ${items.length} available today`}
                </div>
              )}
            </div>

            <div className="mt-9">
              {loading && (
                <>
                  <p role="status" className="sr-only">
                    Loading the menu…
                  </p>
                  <MenuGridSkeleton />
                </>
              )}

              {!loading && error && (
                <div
                  role="alert"
                  className="rounded-[1.75rem] border border-red-200 bg-red-50 p-6 sm:p-8"
                >
                  <p className="font-display text-2xl font-semibold text-red-950">
                    We couldn’t load the menu.
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-red-800">
                    Please try again. If you are developing this page, check the
                    API terminal for the exact error.
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
              )}

              {!loading && !error && items.length === 0 && (
                <div className="rounded-[1.75rem] border border-cream-200 bg-white p-10 text-center shadow-sm">
                  <p className="font-display text-2xl font-semibold text-ink-900">
                    The menu is being updated.
                  </p>
                  <p className="mt-2 text-sm text-ink-500">
                    Please check back shortly.
                  </p>
                  <button
                    type="button"
                    onClick={reload}
                    className="mt-5 rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-cream-50 transition hover:bg-ink-700"
                  >
                    Refresh menu
                  </button>
                </div>
              )}

              {!loading && !error && items.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
                  {items.map((item, index) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      quantityInCart={
                        cartItems.find(
                          (cartItem) => cartItem.menuItemId === item.id,
                        )?.quantity ?? 0
                      }
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24"
        >
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-10 text-cream-50 shadow-2xl shadow-ink-900/15 sm:px-10 lg:px-12 lg:py-14">
            <div className="relative">
              <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-brand-500/10 blur-3xl" />

              <div className="relative grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
                    How it works
                  </p>
                  <h2 className="mt-3 max-w-md font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    From menu to collection, in three steps.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-6 text-cream-200/60">
                    A simple ordering flow built around a live queue, so you
                    always know what is happening in the kitchen.
                  </p>
                </div>

                <ol className="grid gap-3 sm:grid-cols-3">
                  {howItWorksSteps.map((step) => (
                    <li
                      key={step.number}
                      className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5"
                    >
                      <span className="font-display text-2xl font-semibold text-brand-300">
                        {step.number}
                      </span>
                      <p className="mt-5 text-sm font-semibold text-cream-50">
                        {step.title}
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-cream-200/55">
                        {step.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter restaurantName={restaurant.name} />

      {toast && (
        <div className="fixed inset-x-4 bottom-5 z-[60] mx-auto max-w-md sm:inset-x-auto sm:right-6 sm:mx-0">
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl bg-ink-900 p-4 text-cream-50 shadow-2xl ring-1 ring-white/10"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-100 text-leaf-700">
              <CheckIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5">
                {toast.name} added to your cart
              </p>
              <Link
                to="/cart"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-300 transition hover:text-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
              >
                View cart
                <ArrowIcon />
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss cart notification"
              className="grid size-8 shrink-0 place-items-center rounded-full text-cream-200/60 transition hover:bg-white/10 hover:text-cream-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
