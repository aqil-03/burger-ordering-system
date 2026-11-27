import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { vendorMe, vendorLogout } from '../../api/vendor'
import VendorLayout from '../../layouts/VendorLayout'
import { BurgerIcon } from '../../components/customer/BurgerIcon'

function VendorAuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-500 text-cream-50 shadow-lg shadow-brand-500/20">
          <BurgerIcon className="size-8" />
        </span>
        <p className="mt-4 font-display text-xl font-semibold text-ink-900">
          Opening the vendor dashboard…
        </p>
        <p className="mt-1 text-xs text-ink-500">
          Verifying your secure session.
        </p>
      </div>
    </div>
  )
}

export default function VendorProtectedRoute() {
  const navigate = useNavigate()
  const [vendor, setVendor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    vendorMe({ signal: controller.signal })
      .then((currentVendor) => {
        setVendor(currentVendor)
        setError('')
        setUnauthorized(false)
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return

        if (requestError.status === 401) {
          setUnauthorized(true)
        } else {
          setError(requestError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    document.title = 'Vendor dashboard · Burger House'
  }, [])

  async function handleLogout() {
    try {
      await vendorLogout()
    } catch {
      // Clear the local view even if the session was already gone.
    } finally {
      setVendor(null)
      navigate('/vendor/login', { replace: true })
    }
  }

  function retry() {
    setLoading(true)
    setError('')
    setUnauthorized(false)
    setAttempt((current) => current + 1)
  }

  if (loading) {
    return <VendorAuthLoading />
  }

  if (unauthorized) {
    return <Navigate to="/vendor/login" replace />
  }

  if (error || !vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
        <div className="w-full max-w-md rounded-[2rem] border border-red-200 bg-white p-7 text-center shadow-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
            <BurgerIcon className="size-8" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">
            We couldn’t verify your session.
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            {error || 'Please sign in again.'}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={retry}
              className="rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-cream-50 transition hover:bg-ink-700"
            >
              Try again
            </button>
            <Link
              to="/vendor/login"
              className="rounded-full border border-cream-300 px-5 py-3 text-sm font-semibold text-ink-700 transition hover:bg-cream-100"
            >
              Vendor login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <VendorLayout vendor={vendor} onLogout={handleLogout}>
      <Outlet context={{ vendor }} />
    </VendorLayout>
  )
}
