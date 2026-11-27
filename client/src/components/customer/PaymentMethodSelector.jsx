import { useState } from 'react'
import { useCheckout } from '../../context/checkout'
import PaymentStatusBadge from '../shared/PaymentStatusBadge'

function QrIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <path d="M15 15h2v2h-2zM19 15h2v4M15 19v2h4M19 21h2" />
    </svg>
  )
}

function BankIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 9 9-5 9 5M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M3 20h18" />
    </svg>
  )
}

function CashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9h.01M18 15h.01" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9v5M10 6.5h.01" />
    </svg>
  )
}

const methodIcons = {
  DUITNOW: QrIcon,
  ONLINE_BANKING: BankIcon,
  CASH: CashIcon,
}

const methodDescriptions = {
  DUITNOW: 'Scan the QR with your banking app.',
  ONLINE_BANKING: 'Demo only — no real bank connection.',
  CASH: 'Pay when you collect at the counter.',
}

export default function PaymentMethodSelector({
  options,
  loading,
  error,
  onRetry,
  disabled,
  disabledMessage,
}) {
  const { paymentMethod, selectPaymentMethod } = useCheckout()
  const [demoResult, setDemoResult] = useState('')

  const methods = options
    ? [
        options.methods.duitnow,
        options.methods.onlineBanking,
        options.methods.cash,
      ].filter(Boolean)
    : []
  const selectedMethod = methods.find(
    (method) => method.id === paymentMethod && method.enabled,
  )

  function chooseMethod(methodId) {
    if (disabled) return
    selectPaymentMethod(methodId)
    setDemoResult('')
  }

  return (
    <section
      aria-labelledby="payment-method-heading"
      className="mt-6 rounded-[1.75rem] border border-cream-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Payment
          </p>
          <h2
            id="payment-method-heading"
            className="mt-2 scroll-mt-24 font-display text-3xl font-semibold tracking-tight text-ink-900"
          >
            How would you like to pay?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
            Choose a method to see the expected payment status. Your cart and
            details are required before a payment method can be selected.
          </p>
        </div>

        {options?.previewOnly && (
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800">
            Checkout preview
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-2xl border border-cream-200 bg-cream-50"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5"
        >
          <p className="text-sm font-semibold text-red-950">
            Payment options could not be loaded.
          </p>
          <p className="mt-1.5 font-mono text-xs text-red-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full bg-red-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <fieldset className="mt-6" disabled={disabled}>
            <legend className="sr-only">Payment method</legend>
            <div className="grid gap-3 md:grid-cols-3">
              {methods.map((method) => {
                const Icon = methodIcons[method.id] || QrIcon
                const isSelected = paymentMethod === method.id
                const isUnavailable = !method.enabled || disabled

                return (
                  <label
                    key={method.id}
                    className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 transition ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/15'
                        : 'border-cream-200 bg-white hover:border-brand-300'
                    } ${
                      isUnavailable
                        ? 'cursor-not-allowed opacity-55'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={method.id}
                      checked={isSelected}
                      onChange={() => chooseMethod(method.id)}
                      disabled={!method.enabled || disabled}
                      className="absolute right-4 top-4 size-4 accent-brand-500"
                    />

                    <span
                      className={`grid size-10 place-items-center rounded-xl ${
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-cream-100 text-ink-600'
                      }`}
                    >
                      <Icon />
                    </span>

                    <span className="mt-4 pr-6 text-sm font-semibold text-ink-900">
                      {method.label}
                    </span>
                    <span className="mt-1 text-xs leading-5 text-ink-500">
                      {methodDescriptions[method.id] || method.note}
                    </span>

                    <span className="mt-3 flex flex-wrap items-center gap-1.5">
                      <PaymentStatusBadge status={method.statusPreview} />
                      {method.isDemo && (
                        <span className="rounded-full bg-cream-200 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-600">
                          Demo
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {disabled && disabledMessage && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
              {disabledMessage}
            </p>
          )}

          {!disabled && !selectedMethod && (
            <p className="mt-4 text-xs text-ink-400">
              Select a payment method above to see its instructions.
            </p>
          )}

          {!disabled && selectedMethod && (
            <div className="mt-5">
              {selectedMethod.id === 'DUITNOW' && (
                <div className="grid gap-5 rounded-2xl border border-cream-200 bg-cream-50 p-4 sm:p-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                  <div className="mx-auto w-full max-w-[220px] rounded-2xl bg-white p-3 shadow-sm ring-1 ring-cream-200">
                    {selectedMethod.qrImageUrl ? (
                      <img
                        src={selectedMethod.qrImageUrl}
                        alt={
                          selectedMethod.isDemo
                            ? 'Demo DuitNow QR code — not a real payment'
                            : 'DuitNow payment QR code'
                        }
                        className="w-full rounded-lg"
                      />
                    ) : (
                      <p className="p-8 text-center text-xs text-ink-500">
                        The vendor has not configured a DuitNow QR code yet.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl font-semibold text-ink-900">
                        DuitNow QR
                      </h3>
                      <PaymentStatusBadge
                        status={selectedMethod.statusPreview}
                      />
                    </div>

                    {selectedMethod.isDemo && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                        <p className="font-bold">
                          Demo QR — do not scan or send money.
                        </p>
                        <p className="mt-1">
                          This sample QR is not connected to DuitNow. It
                          contains a warning message when scanned and must be
                          replaced by the vendor with their real payment QR
                          before launch.
                        </p>
                      </div>
                    )}

                    <p className="mt-3 text-sm leading-6 text-ink-600">
                      {selectedMethod.note}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-ink-400">
                      Payment remains <strong>Pending Verification</strong>{' '}
                      until the vendor confirms receipt. The customer can never
                      mark a DuitNow payment as Paid.
                    </p>
                  </div>
                </div>
              )}

              {selectedMethod.id === 'ONLINE_BANKING' && (
                <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-cream-50">
                      Demo mode
                    </span>
                    <PaymentStatusBadge
                      status={
                        demoResult || selectedMethod.statusPreview
                      }
                    />
                  </div>

                  <h3 className="mt-3 font-display text-xl font-semibold text-ink-900">
                    Demo online banking
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-600">
                    No real bank or payment gateway is connected. No username,
                    password, PIN, OTP, card number, or banking credentials are
                    collected on this page.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDemoResult('PENDING_VERIFICATION')
                      }
                      className="rounded-full bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                      Simulate successful bank return
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoResult('FAILED')}
                      className="rounded-full border border-cream-300 bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-cream-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                      Simulate failed payment
                    </button>
                  </div>

                  {demoResult && (
                    <div
                      role="status"
                      className={`mt-4 rounded-xl border p-3.5 text-xs leading-5 ${
                        demoResult === 'FAILED'
                          ? 'border-red-200 bg-red-50 text-red-800'
                          : 'border-amber-200 bg-amber-50 text-amber-900'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">Demo result:</p>
                        <PaymentStatusBadge status={demoResult} />
                      </div>
                      <p className="mt-1.5">
                        {demoResult === 'FAILED'
                          ? 'The demo payment failed. Nothing was charged and no payment was marked Paid.'
                          : 'A real gateway would notify the server with a signed callback. This demo does not contact a bank, does not charge money, and can never mark a payment as Paid.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDemoResult('')}
                        className="mt-2 font-semibold underline underline-offset-4"
                      >
                        Clear demo result
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedMethod.id === 'CASH' && (
                <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl font-semibold text-ink-900">
                      Cash at the counter
                    </h3>
                    <PaymentStatusBadge
                      status={selectedMethod.statusPreview}
                    />
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
                    {selectedMethod.note}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-ink-400">
                    No cash is collected by this website. The vendor confirms
                    the payment after receiving cash.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {options?.previewOnly && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
          <InfoIcon />
          <p>
            <strong>Checkout preview:</strong> no order has been placed and no
            payment has been taken. The final order step will confirm the total
            and queue number before anything is charged.
          </p>
        </div>
      )}
    </section>
  )
}
