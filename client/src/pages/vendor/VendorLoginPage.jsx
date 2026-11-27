import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { vendorLogin, vendorMe } from '../../api/vendor'
import { BurgerIcon } from '../../components/customer/BurgerIcon'

function EyeIcon({ open = true }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {open ? (
        <>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.7" />
        </>
      ) : (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 6.1A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15.7 15.7 0 0 1-3.2 3.7M6.5 7.5A15.6 15.6 0 0 0 2.5 12S6 18 12 18c1.5 0 2.8-.3 4-.9" />
        </>
      )}
    </svg>
  )
}

function LoginFeature({ number, title, description }) {
  return (
    <li className="flex gap-3.5">
      <span className="font-display text-lg font-semibold text-brand-300">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-cream-50">{title}</p>
        <p className="mt-1 text-xs leading-5 text-cream-200/50">
          {description}
        </p>
      </div>
    </li>
  )
}

export default function VendorLoginPage() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Vendor login · Burger House'
    const controller = new AbortController()

    vendorMe({ signal: controller.signal })
      .then(() => {
        navigate('/vendor', { replace: true })
      })
      .catch(() => {
        // A signed-out visitor stays on the login form.
      })

    return () => controller.abort()
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting) return

    setError('')
    setSubmitting(true)

    try {
      await vendorLogin({ identifier, password })
      navigate('/vendor', { replace: true })
    } catch (requestError) {
      setError(
        requestError.message ||
          'Sign in failed. Please check your credentials and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-cream-50">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-100/70 via-cream-50 to-cream-50" />
      <div className="pointer-events-none absolute -right-32 top-24 size-[30rem] rounded-full border-[52px] border-white/60" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_440px] lg:gap-10 lg:px-8 lg:py-10">
        <section className="relative hidden overflow-hidden rounded-[2rem] bg-ink-900 p-10 text-cream-50 shadow-2xl shadow-ink-900/20 lg:block">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 size-56 rounded-full bg-brand-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-500 text-cream-50">
                <BurgerIcon className="size-6" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold leading-tight">
                  Burger House
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cream-200/45">
                  Vendor console
                </p>
              </div>
            </div>

            <p className="mt-20 font-display text-5xl font-semibold leading-[0.98] tracking-tight">
              Keep the queue
              <br />
              <span className="text-brand-300">moving.</span>
            </p>
            <p className="mt-5 max-w-sm text-sm leading-6 text-cream-200/55">
              One secure place for incoming orders, payments and the lunch-rush
              queue.
            </p>

            <ul className="mt-12 space-y-5">
              <LoginFeature
                number="01"
                title="Authorised access only"
                description="Passwords are hashed and sessions are protected by an httpOnly cookie."
              />
              <LoginFeature
                number="02"
                title="Orders in one view"
                description="Queue numbers, customer details, instructions and payment status."
              />
              <LoginFeature
                number="03"
                title="Built for the counter"
                description="A clear tablet and desktop dashboard for busy service."
              />
            </ul>
          </div>
        </section>

        <main>
          <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-500 text-cream-50">
                <BurgerIcon className="size-6" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold leading-tight text-ink-900">
                  Burger House
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  Vendor console
                </p>
              </div>
            </div>
            <Link
              to="/"
              className="text-xs font-semibold text-ink-500 underline decoration-cream-300 underline-offset-4"
            >
              Customer site
            </Link>
          </div>

          <div className="rounded-[2rem] border border-cream-200 bg-white p-6 shadow-xl shadow-ink-900/5 sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-600">
              <span className="size-1.5 rounded-full bg-brand-500" />
              Vendor access
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink-900">
              Sign in to the dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Use your vendor email or username. There is no public vendor
              registration.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="vendor-identifier"
                  className="text-xs font-semibold text-ink-700"
                >
                  Email or username
                </label>
                <input
                  id="vendor-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={identifier}
                  onChange={(event) => {
                    setIdentifier(event.target.value)
                    setError('')
                  }}
                  placeholder="owner"
                  required
                  className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50/60 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="vendor-password"
                  className="text-xs font-semibold text-ink-700"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    id="vendor-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError('')
                    }}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-cream-300 bg-cream-50/60 px-4 py-3 pr-12 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-400 transition hover:bg-cream-100 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 border-t border-cream-200 pt-4 text-xs text-ink-400">
              <p>
                Vendor accounts are created from the server environment. There
                is no self-service sign-up.
              </p>
              <Link
                to="/"
                className="mt-2 inline-block font-semibold text-ink-500 underline decoration-cream-300 underline-offset-4 transition hover:text-brand-600"
              >
                ← Back to customer menu
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
