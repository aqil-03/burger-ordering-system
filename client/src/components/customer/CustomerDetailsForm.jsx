import { useState } from 'react'
import { useCheckout } from '../../context/checkout'
import {
  CUSTOMER_NAME_MAX_LENGTH,
  CUSTOMER_PHONE_MAX_LENGTH,
  validateCustomerDetails,
} from '../../utils/customerValidation'

export default function CustomerDetailsForm({ disabled, disabledMessage }) {
  const { customer, saveCustomer, clearCustomer } = useCheckout()
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [errors, setErrors] = useState({ name: '', phone: '' })
  const savedDetails = customer

  function updateField(field, value) {
    if (field === 'name') setName(value)
    if (field === 'phone') setPhone(value)

    setErrors((currentErrors) => ({ ...currentErrors, [field]: '' }))

    if (customer) {
      clearCustomer()
    }
  }

  function handleSubmit(event) {
    event.preventDefault()

    const result = validateCustomerDetails({ name, phone })
    setErrors(result.errors)

    if (result.errors.name || result.errors.phone) {
      if (customer) clearCustomer()
      return
    }

    saveCustomer(result.values)
  }

  const inputClassName = (hasError) =>
    `mt-2 w-full rounded-xl border bg-cream-50/60 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-4 ${
      hasError
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
        : 'border-cream-300 focus:border-brand-500 focus:ring-brand-500/10'
    }`

  return (
    <section
      aria-labelledby="customer-details-heading"
      className="rounded-[1.5rem] border border-cream-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
        Customer details
      </p>
      <h2
        id="customer-details-heading"
        className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-900"
      >
        Who is this order for?
      </h2>
      <p className="mt-2 text-xs leading-5 text-ink-500">
        No account or email needed. We use these details to identify your order
        at the counter.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="customer-name"
            className="text-xs font-semibold text-ink-700"
          >
            Full name
          </label>
          <input
            id="customer-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => updateField('name', event.target.value)}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={CUSTOMER_NAME_MAX_LENGTH}
            placeholder="e.g. Ahmad bin Ali"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'customer-name-error' : undefined}
            className={inputClassName(Boolean(errors.name))}
          />
          {errors.name && (
            <p
              id="customer-name-error"
              role="alert"
              className="mt-1.5 text-xs text-red-700"
            >
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="customer-phone"
            className="text-xs font-semibold text-ink-700"
          >
            Malaysian mobile number
          </label>
          <input
            id="customer-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => updateField('phone', event.target.value)}
            autoComplete="tel"
            maxLength={CUSTOMER_PHONE_MAX_LENGTH}
            placeholder="e.g. 012-345 6789"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={
              errors.phone ? 'customer-phone-error' : 'customer-phone-help'
            }
            className={inputClassName(Boolean(errors.phone))}
          />
          {errors.phone ? (
            <p
              id="customer-phone-error"
              role="alert"
              className="mt-1.5 text-xs text-red-700"
            >
              {errors.phone}
            </p>
          ) : (
            <p
              id="customer-phone-help"
              className="mt-1.5 text-[11px] text-ink-400"
            >
              Mobile numbers only. You can enter 012-345 6789 or +60 12-345
              6789.
            </p>
          )}
        </div>

        {disabled && disabledMessage && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
            {disabledMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex w-full items-center justify-center rounded-full bg-ink-900 px-5 py-3.5 text-sm font-semibold text-cream-50 transition hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-ink-400"
        >
          {savedDetails ? 'Update details' : 'Save details'}
        </button>
      </form>

      {savedDetails && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-leaf-100 bg-leaf-100/60 p-4"
        >
          <p className="text-sm font-semibold text-leaf-700">
            Details saved
          </p>
          <p className="mt-1 text-sm text-leaf-700">{savedDetails.name}</p>
          <p className="text-xs text-leaf-700">{savedDetails.phone}</p>
          <p className="mt-2 text-[11px] leading-5 text-leaf-700/80">
            Your details are ready for checkout. No order has been placed yet.
          </p>
        </div>
      )}
    </section>
  )
}
