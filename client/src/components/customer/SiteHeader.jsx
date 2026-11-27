import { Link } from 'react-router-dom'
import { useCart } from '../../context/cart'
import { BurgerIcon } from './BurgerIcon'
import { CartIcon } from './CartIcon'

export default function SiteHeader({
  restaurantName = 'Burger House',
  logoUrl = null,
}) {
  const { totalQuantity } = useCart()
  const badgeValue = totalQuantity > 99 ? '99+' : totalQuantity

  return (
    <header className="sticky top-0 z-50 border-b border-cream-200/80 bg-cream-50/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
          aria-label={`${restaurantName} home`}
        >
          <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-500 text-cream-50 shadow-sm">
            <BurgerIcon className="absolute size-6" />
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                className="relative size-full object-cover"
                onError={(event) => {
                  event.currentTarget.hidden = true
                }}
              />
            )}
          </span>

          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold leading-tight tracking-tight text-ink-900">
              {restaurantName}
            </span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-500">
              Online ordering
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1 text-xs font-semibold">
          <a
            href="/#menu"
            className="hidden rounded-full px-3.5 py-2 text-ink-500 transition hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:inline-flex"
          >
            Menu
          </a>
          <a
            href="/#how-it-works"
            className="hidden rounded-full px-3.5 py-2 text-ink-500 transition hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 md:inline-flex"
          >
            How it works
          </a>

          <Link
            to="/cart"
            aria-label={`Cart, ${totalQuantity} ${
              totalQuantity === 1 ? 'item' : 'items'
            }`}
            className="relative ml-1 inline-flex items-center gap-2 rounded-full bg-brand-500 px-3.5 py-2.5 text-cream-50 shadow-sm transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <CartIcon className="size-4" />
            <span className="hidden sm:inline">Cart</span>
            {totalQuantity > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-ink-900 px-1.5 py-0.5 text-[10px] font-bold leading-none text-cream-50">
                {badgeValue}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}
