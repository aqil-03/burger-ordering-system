import { useRef, useState } from 'react'
import {
  updateVendorOrderStatus,
  updateVendorPaymentStatus,
} from '../../api/vendor'
import OrderStatusBadge from '../shared/OrderStatusBadge'
import PaymentStatusBadge from '../shared/PaymentStatusBadge'
import { PAYMENT_METHOD_LABELS } from '../../constants/payment'
import { formatRinggit } from '../../utils/formatCurrency'

const ACTIVE_STATUSES = ['WAITING', 'PREPARING', 'READY']

function formatQueueNumber(queueNumber) {
  return String(queueNumber ?? 0).padStart(3, '0')
}

function formatDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function paymentHint(order, latestEvent) {
  if (order.paymentStatus === 'PAID') {
    return 'Payment confirmed by the vendor.'
  }

  if (order.paymentStatus === 'REFUNDED') {
    return 'Payment refunded.'
  }

  if (order.paymentStatus === 'FAILED') {
    return 'Payment marked as failed.'
  }

  if (order.paymentMethod === 'DUITNOW') {
    return 'Verify the DuitNow transfer in your banking app before marking it Paid.'
  }

  if (order.paymentMethod === 'ONLINE_BANKING') {
    return latestEvent?.provider === 'DEMO_ONLINE_BANKING'
      ? 'Demo online banking only — no real payment was taken. This cannot be marked Paid.'
      : 'Verify the bank payment before marking it Paid.'
  }

  if (order.paymentMethod === 'CASH') {
    return 'Collect cash at the counter, then confirm the payment.'
  }

  return 'Payment verification is handled in the vendor dashboard.'
}

function workflowHint(order, preparationLimitReached) {
  if (order.orderStatus === 'WAITING' && !order.acceptedAt) {
    return 'Accept the order to acknowledge it before preparation.'
  }

  if (order.orderStatus === 'WAITING' && order.acceptedAt) {
    return preparationLimitReached
      ? 'Another order is already being prepared. Finish it before starting this one.'
      : 'This order is accepted and ready to start.'
  }

  if (order.orderStatus === 'PREPARING') {
    return 'Finish preparing when the food is ready for collection.'
  }

  if (order.orderStatus === 'READY') {
    return 'Mark the order completed after the customer collects it.'
  }

  if (order.orderStatus === 'COMPLETED') {
    return 'This order has been collected and completed.'
  }

  if (order.orderStatus === 'CANCELLED') {
    return 'This order was cancelled.'
  }

  return ''
}

function paymentConfirmCopy(status) {
  if (status === 'PAID') {
    return {
      title: 'Confirm payment received?',
      body: 'This records the vendor verification and marks the order payment as Paid.',
      button: 'Confirm paid',
    }
  }

  if (status === 'FAILED') {
    return {
      title: 'Mark this payment as failed?',
      body: 'Use this when the payment did not go through or the customer did not pay.',
      button: 'Confirm failed',
    }
  }

  return {
    title: 'Mark this payment as refunded?',
    body: 'Only do this after the refund has actually been processed.',
    button: 'Confirm refund',
  }
}

export default function VendorOrderCard({
  order,
  isNextEligible = false,
  maxPreparing = 1,
  preparingCount = 0,
  onRefresh,
  onUnauthorized,
}) {
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [cancelNote, setCancelNote] = useState('')
  const [paymentConfirm, setPaymentConfirm] = useState('')
  const inFlightRef = useRef(false)

  const latestPaymentEvent = order.paymentEvents?.[0] ?? null
  const isDemoOnlineBanking =
    latestPaymentEvent?.provider === 'DEMO_ONLINE_BANKING'
  const paymentPending = ['PENDING_VERIFICATION', 'PENDING_PAYMENT'].includes(
    order.paymentStatus,
  )
  const preparationLimitReached = preparingCount >= maxPreparing
  const activeOrder = ACTIVE_STATUSES.includes(order.orderStatus)
  const itemCount = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  )
  const canAccept = order.orderStatus === 'WAITING' && !order.acceptedAt
  const canStart =
    order.orderStatus === 'WAITING' &&
    Boolean(order.acceptedAt) &&
    !preparationLimitReached
  const canStartButBlocked =
    order.orderStatus === 'WAITING' &&
    Boolean(order.acceptedAt) &&
    preparationLimitReached
  const canFinish = order.orderStatus === 'PREPARING'
  const canComplete = order.orderStatus === 'READY'
  const canCancel = activeOrder

  async function finishAction() {
    await onRefresh?.()
    inFlightRef.current = false
    setBusyAction('')
  }

  async function runOrderAction(action, note = '') {
    if (inFlightRef.current || busyAction) return

    inFlightRef.current = true
    setBusyAction(action)
    setError('')

    try {
      await updateVendorOrderStatus(order.id, action, note)
      setShowCancel(false)
      setCancelNote('')
      await finishAction(action)
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized?.()
        return
      }

      setError(requestError.message)
      await finishAction(action)
    }
  }

  async function runPaymentAction(status) {
    if (inFlightRef.current || busyAction) return

    inFlightRef.current = true
    setBusyAction(`PAYMENT_${status}`)
    setError('')

    try {
      await updateVendorPaymentStatus(order.id, status)
      setPaymentConfirm('')
      await finishAction(status)
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized?.()
        return
      }

      setError(requestError.message)
      await finishAction(status)
    }
  }

  function actionLabel(defaultText, busyText, actionKey) {
    return busyAction === actionKey ? busyText : defaultText
  }

  const paymentLabel =
    order.paymentMethod === 'DUITNOW'
      ? 'Verify DuitNow payment'
      : order.paymentMethod === 'CASH'
        ? 'Confirm cash received'
        : 'Verify bank payment'

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-cream-200 bg-white shadow-sm">
      <header className="border-b border-cream-200 bg-cream-50/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="min-w-16 rounded-2xl bg-ink-900 px-2.5 py-2 text-center text-cream-50">
              <span className="block text-[8px] font-semibold uppercase tracking-[0.16em] text-cream-200/50">
                Queue
              </span>
              <span className="mt-0.5 block font-display text-2xl font-semibold leading-none">
                {formatQueueNumber(order.queueNumber)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {order.customerName}
              </p>
              <a
                href={`tel:${order.customerPhone}`}
                className="mt-0.5 inline-block text-xs text-ink-500 underline decoration-cream-300 underline-offset-4 transition hover:text-brand-600"
              >
                {order.customerPhone}
              </a>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-1.5">
              {isNextEligible && order.orderStatus === 'WAITING' && (
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-brand-600">
                  Next in queue
                </span>
              )}
              {order.acceptedAt && order.orderStatus === 'WAITING' && (
                <span className="rounded-full bg-leaf-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-leaf-700">
                  Accepted
                </span>
              )}
              <OrderStatusBadge status={order.orderStatus} />
            </div>
            <p className="text-[10px] text-ink-400">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
              Items
            </p>
            <span className="text-[10px] font-medium text-ink-400">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <ul className="mt-2 divide-y divide-cream-200">
            {order.items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">
                      {item.quantity} × {item.itemName}
                    </p>
                    {item.specialInstructions && (
                      <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-5 text-amber-900">
                        Instruction: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-ink-900">
                    {formatRinggit(item.unitPriceSen * item.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-3 font-mono text-[10px] tracking-tight text-ink-400">
            {order.orderRef}
          </p>
        </div>

        <aside className="rounded-2xl bg-cream-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Payment
            </span>
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>

          <p className="mt-2 text-sm font-semibold text-ink-900">
            {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-ink-500">
            {paymentHint(order, latestPaymentEvent)}
          </p>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-cream-200 pt-3">
            <span className="text-xs font-semibold text-ink-600">Total</span>
            <span className="font-display text-2xl font-semibold tracking-tight text-ink-900">
              {formatRinggit(order.totalSen)}
            </span>
          </div>

          {isDemoOnlineBanking && paymentPending && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-900">
              Demo only. No real bank payment can be confirmed for this order.
            </p>
          )}

          {paymentPending && !isDemoOnlineBanking && (
            <button
              type="button"
              onClick={() => setPaymentConfirm('PAID')}
              disabled={Boolean(busyAction)}
              className="mt-3 w-full rounded-full bg-leaf-700 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-leaf-700/90 disabled:cursor-wait disabled:opacity-60"
            >
              {busyAction === 'PAYMENT_PAID'
                ? 'Updating payment…'
                : paymentLabel}
            </button>
          )}

          {paymentPending && (
            <button
              type="button"
              onClick={() => setPaymentConfirm('FAILED')}
              disabled={Boolean(busyAction)}
              className="mt-2 w-full rounded-full border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
            >
              {busyAction === 'PAYMENT_FAILED'
                ? 'Updating payment…'
                : 'Mark payment failed'}
            </button>
          )}

          {order.paymentStatus === 'PAID' && (
            <button
              type="button"
              onClick={() => setPaymentConfirm('REFUNDED')}
              disabled={Boolean(busyAction)}
              className="mt-3 w-full rounded-full border border-cream-300 bg-white px-3 py-2 text-[11px] font-semibold text-ink-600 transition hover:bg-cream-100 disabled:cursor-wait disabled:opacity-60"
            >
              {busyAction === 'PAYMENT_REFUNDED'
                ? 'Updating payment…'
                : 'Mark refunded'}
            </button>
          )}

          {paymentConfirm && (
            <div className="mt-3 rounded-xl border border-ink-900/10 bg-white p-3">
              <p className="text-[11px] font-semibold text-ink-900">
                {paymentConfirmCopy(paymentConfirm).title}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-ink-500">
                {paymentConfirmCopy(paymentConfirm).body}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => runPaymentAction(paymentConfirm)}
                  disabled={Boolean(busyAction)}
                  className="flex-1 rounded-full bg-ink-900 px-2.5 py-2 text-[10px] font-semibold text-cream-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {paymentConfirmCopy(paymentConfirm).button}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentConfirm('')}
                  disabled={Boolean(busyAction)}
                  className="rounded-full border border-cream-300 px-2.5 py-2 text-[10px] font-semibold text-ink-500"
                >
                  Keep
                </button>
              </div>
            </div>
          )}

          <details className="mt-4 border-t border-cream-200 pt-3">
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400 marker:text-ink-300">
              Payment history ({order.paymentEvents?.length ?? 0})
            </summary>
            <ol className="mt-3 space-y-3">
              {(order.paymentEvents ?? []).map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-cream-200 bg-white px-2.5 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <PaymentStatusBadge status={event.status} />
                    <span className="text-[9px] text-ink-400">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                  {event.note && (
                    <p className="mt-1.5 text-[10px] leading-4 text-ink-500">
                      {event.note}
                    </p>
                  )}
                  {event.verifiedByName && (
                    <p className="mt-1 text-[9px] text-ink-400">
                      by {event.verifiedByName}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </details>
        </aside>
      </div>

      <footer className="border-t border-cream-200 bg-cream-50/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Order actions
            </p>
            <p className="mt-1 max-w-xl text-[11px] leading-5 text-ink-500">
              {workflowHint(order, preparationLimitReached)}
            </p>
            {order.orderStatus === 'CANCELLED' &&
              order.cancellationNote && (
                <p className="mt-1 max-w-xl text-[11px] leading-5 text-red-700">
                  Cancellation reason: {order.cancellationNote}
                </p>
              )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canAccept && (
              <button
                type="button"
                onClick={() => runOrderAction('ACCEPT')}
                disabled={Boolean(busyAction)}
                className="rounded-full bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
              >
                {actionLabel('Accept order', 'Accepting…', 'ACCEPT')}
              </button>
            )}

            {canStart && (
              <button
                type="button"
                onClick={() => runOrderAction('START_PREPARING')}
                disabled={Boolean(busyAction)}
                className="rounded-full bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
              >
                {actionLabel(
                  'Start preparing',
                  'Starting…',
                  'START_PREPARING',
                )}
              </button>
            )}

            {canStartButBlocked && (
              <button
                type="button"
                disabled
                className="rounded-full bg-cream-200 px-4 py-2.5 text-xs font-semibold text-ink-400"
              >
                Start preparing
              </button>
            )}

            {canFinish && (
              <button
                type="button"
                onClick={() => runOrderAction('FINISH_PREPARING')}
                disabled={Boolean(busyAction)}
                className="rounded-full bg-leaf-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-leaf-700/90 disabled:cursor-wait disabled:opacity-60"
              >
                {actionLabel(
                  'Finish preparing',
                  'Finishing…',
                  'FINISH_PREPARING',
                )}
              </button>
            )}

            {canComplete && (
              <button
                type="button"
                onClick={() => runOrderAction('COMPLETE')}
                disabled={Boolean(busyAction)}
                className="rounded-full bg-ink-900 px-4 py-2.5 text-xs font-semibold text-cream-50 transition hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
              >
                {actionLabel('Mark completed', 'Completing…', 'COMPLETE')}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancel((current) => !current)}
                disabled={Boolean(busyAction)}
                className="rounded-full border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
              >
                Cancel order
              </button>
            )}
          </div>
        </div>

        {showCancel && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <label
              htmlFor={`cancel-${order.id}`}
              className="text-[11px] font-semibold text-red-900"
            >
              Reason for cancellation (optional)
            </label>
            <input
              id={`cancel-${order.id}`}
              value={cancelNote}
              onChange={(event) => setCancelNote(event.target.value)}
              maxLength={250}
              placeholder="e.g. Customer requested cancellation"
              className="mt-1.5 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runOrderAction('CANCEL', cancelNote)}
                disabled={Boolean(busyAction)}
                className="rounded-full bg-red-800 px-3.5 py-2 text-[11px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {actionLabel('Confirm cancellation', 'Cancelling…', 'CANCEL')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancel(false)
                  setCancelNote('')
                }}
                disabled={Boolean(busyAction)}
                className="rounded-full border border-red-200 bg-white px-3.5 py-2 text-[11px] font-semibold text-red-700"
              >
                Keep order
              </button>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-5 text-red-800"
          >
            {error}
          </p>
        )}
      </footer>
    </article>
  )
}
