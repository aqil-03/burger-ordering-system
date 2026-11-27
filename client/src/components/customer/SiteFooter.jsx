import { BurgerIcon } from './BurgerIcon'

const currentYear = new Date().getFullYear()

export default function SiteFooter({ restaurantName = 'Burger House' }) {
  return (
    <footer className="border-t border-cream-200 bg-cream-100/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-500 text-cream-50">
              <BurgerIcon className="size-6" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-ink-900">
                {restaurantName}
              </p>
              <p className="text-xs text-ink-500">
                Freshly made. Served hot.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
            <span>Prices in Malaysian Ringgit (RM)</span>
            <a
              href="/photo-credits.html"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-cream-300 underline-offset-4 transition hover:text-brand-600"
            >
              Photo credits
            </a>
            <a
              href="/vendor/login"
              className="underline decoration-cream-300 underline-offset-4 transition hover:text-brand-600"
            >
              Vendor login
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-cream-200 pt-4 text-[11px] text-ink-400">
          © {currentYear} {restaurantName}. Online ordering system.
        </div>
      </div>
    </footer>
  )
}
