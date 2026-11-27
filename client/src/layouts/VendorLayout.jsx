import { Link, NavLink } from 'react-router-dom'
import { BurgerIcon } from '../components/customer/BurgerIcon'

const navigation = [
  { to: '/vendor', label: 'Dashboard', end: true },
  { to: '/vendor/menu', label: 'Menu management' },
  { to: '/vendor/qr', label: 'QR codes' },
]

function navLinkClass({ isActive }) {
  return `flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm transition ${
    isActive
      ? 'bg-white/10 font-semibold text-cream-50 ring-1 ring-white/10'
      : 'font-medium text-cream-200/60 hover:bg-white/5 hover:text-cream-50'
  }`
}

function mobileNavLinkClass({ isActive }) {
  return `whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${
    isActive
      ? 'bg-ink-900 text-cream-50'
      : 'border border-cream-200 bg-white text-ink-500 hover:bg-cream-100'
  }`
}

function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3H4v14h4M13 7l3 3-3 3M16 10H8" />
    </svg>
  )
}

export default function VendorLayout({ vendor, onLogout, children }) {
  const initial = vendor?.name?.trim()?.charAt(0)?.toUpperCase() || 'V'

  return (
    <div className="min-h-screen bg-cream-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-ink-900 p-5 text-cream-50 lg:flex">
        <Link
          to="/vendor"
          className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-300"
        >
          <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl bg-brand-500 text-cream-50">
            <BurgerIcon className="absolute size-6" />
            <img
              src="/brand-logo.svg"
              alt=""
              className="relative size-full object-cover"
              onError={(event) => {
                event.currentTarget.hidden = true
              }}
            />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold leading-tight">
              Burger House
            </span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-cream-200/45">
              Vendor console
            </span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1" aria-label="Vendor navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`size-1.5 rounded-full ${
                      isActive ? 'bg-brand-300' : 'bg-white/20'
                    }`}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium text-cream-200/60 transition hover:bg-white/5 hover:text-cream-50"
          >
            <span className="size-1.5 rounded-full bg-white/20" />
            View customer site
          </Link>
        </nav>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            Secure session
          </p>
          <p className="mt-1.5 text-xs leading-5 text-cream-200/50">
            This dashboard is available only to authenticated vendor accounts.
          </p>
        </div>

        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 font-display text-sm font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-cream-50">
                {vendor?.name}
              </p>
              <p className="truncate text-[10px] text-cream-200/45">
                {vendor?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-cream-200/70 transition hover:border-white/20 hover:bg-white/5 hover:text-cream-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-cream-200/80 bg-cream-50/90 backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              to="/vendor"
              className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand-500 text-cream-50">
                <BurgerIcon className="size-6" />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold leading-tight text-ink-900">
                  Burger House
                </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  Vendor console
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-cream-100"
            >
              <SignOutIcon />
              Sign out
            </button>
          </div>

          <nav
            aria-label="Vendor mobile navigation"
            className="flex flex-wrap gap-1.5 border-t border-cream-200/70 px-4 py-2 sm:px-6"
          >
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={mobileNavLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/"
              className="whitespace-nowrap rounded-full border border-cream-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-500 transition hover:bg-cream-100"
            >
              Customer site
            </Link>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
