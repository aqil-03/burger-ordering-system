import { formatRinggit } from '../../utils/formatCurrency'

export default function OrderSummary({
  itemCount,
  subtotalSen,
  unavailableCount,
}) {
  return (
    <section
      aria-labelledby="order-summary-heading"
      className="rounded-[1.5rem] border border-cream-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="order-summary-heading"
          className="font-display text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl"
        >
          Order summary
        </h2>
        <span className="whitespace-nowrap rounded-full bg-cream-100 px-3 py-1.5 text-[11px] font-semibold text-ink-600">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-500">Subtotal</dt>
          <dd className="font-semibold text-ink-900">
            {formatRinggit(subtotalSen)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-500">Collection</dt>
          <dd className="font-medium text-ink-700">At the counter</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-cream-200 pt-4">
          <dt className="font-semibold text-ink-900">Total</dt>
          <dd className="font-display text-3xl font-semibold tracking-tight text-ink-900">
            {formatRinggit(subtotalSen)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] leading-5 text-ink-400">
        Prices use the latest menu values and are rechecked by the server when
        the order is placed.
      </p>

      {unavailableCount > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800"
        >
          <p className="font-semibold">
            {unavailableCount}{' '}
            {unavailableCount === 1 ? 'item is' : 'items are'} unavailable.
          </p>
          <p className="mt-1">
            Unavailable items are excluded from the total. Remove them before
            saving your details.
          </p>
        </div>
      )}
    </section>
  )
}
