import { useEffect } from 'react'
import SiteFooter from '../components/customer/SiteFooter'
import SiteHeader from '../components/customer/SiteHeader'

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found · Burger House'
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Error 404
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            This table isn’t on the menu.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink-500 sm:text-base">
            The page you were looking for does not exist. Head back to the menu
            and pick something delicious instead.
          </p>
          <a
            href="/"
            className="mt-7 inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Back to the menu
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
