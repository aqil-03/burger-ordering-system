import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getOrderByTrackingToken } from '../../api/orders'
import { PAYMENT_METHOD_LABELS } from '../../constants/payment'
import OrderStatusBadge from '../../components/shared/OrderStatusBadge'
import PaymentStatusBadge from '../../components/shared/PaymentStatusBadge'
import SiteFooter from '../../components/customer/SiteFooter'
import SiteHeader from '../../components/customer/SiteHeader'
import { BurgerIcon } from '../../components/customer/BurgerIcon'
import { formatRinggit } from '../../utils/formatCurrency'

function formatQueueNumber(queueNumber) {
  return String(queueNumber ?? 0).padStart(3, '0')
}

function formatOrderTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function paymentGuidance(order) {
  if (order.paymentStatus === 'PAID') {
    return 'Payment confirmed. The vendor has verified this payment.'
  }

  if (order.paymentStatus === 'REFUNDED') {
    return 'This payment has been marked as refunded by the vendor.'
  }

  if (order.paymentStatus === 'FAILED') {
    return 'This payment was marked as failed. Please speak to the vendor before ordering again.'
  }

  if (order.paymentMethod === 'DUITNOW') {
    return 'Your DuitNow payment remains Pending Verification until the vendor confirms receipt. Do not send money to the demo QR.'
  }

  if (order.paymentMethod === 'ONLINE_BANKING') {
    return 'This was a demo online-banking selection. No real bank payment was taken. The payment stays Pending Verification in this development build.'
  }

  if (order.paymentMethod === 'CASH') {
    return 'Pay at the counter when you collect. Payment remains Pending Payment until the vendor confirms the cash.'
  }

  return 'Payment status will be confirmed by the vendor.'
}

function orderHeading(order) {
  if (order.orderStatus === 'READY') {
    return 'Your order is ready for collection.'
  }

  if (order.orderStatus === 'COMPLETED') {
    return 'This order is complete.'
  }

  if (order.orderStatus === 'CANCELLED') {
    return 'This order was cancelled.'
  }

  return 'Your order is in the kitchen.'
}

function queueCardHint(order) {
  if (order.orderStatus === 'READY') {
    return 'Your order is ready. Please collect it at the counter.'
  }

  if (order.orderStatus === 'COMPLETED') {
    return 'This order has been collected and completed.'
  }

  if (order.orderStatus === 'CANCELLED') {
    return 'This order was cancelled and will not be prepared.'
  }

  return 'Please wait until this number is called at the counter.'
}

function liveQueueMessage(order, queue) {
  if (!queue) return 'Connecting to the live queue…'

  if (order.orderStatus === 'PREPARING') {
    return 'Your order is being prepared right now.'
  }

  if (order.orderStatus === 'READY') {
    return 'Your order is ready for collection.'
  }

  if (order.orderStatus === 'COMPLETED') {
    return 'Order completed. Thank you!'
  }

  if (order.orderStatus === 'CANCELLED') {
    return 'This order was cancelled.'
  }

  if (queue.nextEligibleQueueNumber === order.queueNumber) {
    return 'You are next in line.'
  }

  if (queue.preparingQueueNumbers.length > 0) {
    const preparing = queue.preparingQueueNumbers
      .map(formatQueueNumber)
      .join(', ')
    return `Queue ${preparing} is being prepared now. Please wait for your turn.`
  }

  return 'Waiting for preparation to start.'
}

function LiveStatusBadge({ status }) {
  const styles = {
    connected: 'bg-leaf-100 text-leaf-700',
    connecting: 'bg-amber-100 text-amber-800',
    reconnecting: 'bg-amber-100 text-amber-800',
  }
  const labels = {
    connected: 'Live',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${styles[status] || styles.connecting}`}
    >
      <span
        className={`size-1.5 rounded-full ${
          status === 'connected'
            ? 'bg-leaf-700'
            : 'animate-pulse bg-amber-600'
        }`}
      />
      {labels[status] || 'Connecting'}
    </span>
  )
}

function LiveQueuePanel({ order, queue, liveStatus }) {
  const preparingNumberSet = new Set(queue?.preparingQueueNumbers ?? [])

  // Keep the customer's own queue row consistent with their live order status,
  // even if their last queue broadcast arrived slightly out of order.
  if (order.orderStatus === 'PREPARING') {
    preparingNumberSet.add(order.queueNumber)
  } else if (
    ['READY', 'COMPLETED', 'CANCELLED'].includes(order.orderStatus)
  ) {
    preparingNumberSet.delete(order.queueNumber)
  }

  const preparingNumbers = [...preparingNumberSet].sort(
    (first, second) => first - second,
  )
  const nextNumber = queue?.nextEligibleQueueNumber

  return (
    <section
      aria-labelledby="live-queue-heading"
      aria-live="polite"
      className="mt-5 rounded-2xl border border-cream-200 bg-cream-50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="live-queue-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600"
        >
          Live queue
        </h2>
        <LiveStatusBadge status={liveStatus} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-cream-200 bg-white px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            Now preparing
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
            {preparingNumbers.length > 0
              ? preparingNumbers.map(formatQueueNumber).join(', ')
              : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-cream-200 bg-white px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            Next eligible
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
            {nextNumber ? formatQueueNumber(nextNumber) : '—'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-ink-500">
        {liveQueueMessage(order, queue)}
      </p>
    </section>
  )
}

function ConfirmationSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="animate-pulse rounded-[2rem] border border-cream-200 bg-white p-8">
        <div className="h-3 w-28 rounded-full bg-cream-100" />
        <div className="mt-4 h-10 w-2/3 rounded-lg bg-cream-100" />
        <div className="mt-8 h-56 rounded-3xl bg-cream-100" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="h-40 rounded-2xl bg-cream-50" />
          <div className="h-40 rounded-2xl bg-cream-50" />
        </div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  const { trackingToken } = useParams()
  const [order, setOrder] = useState(null)
  const [queue, setQueue] = useState(null)
  const [liveStatus, setLiveStatus] = useState('connecting')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getOrderByTrackingToken(trackingToken, { signal: controller.signal })
      .then((data) => {
        setOrder(data.order)
        setQueue(data.queue ?? null)
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return
        setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [trackingToken, attempt])

  useEffect(() => {
    if (!trackingToken) return undefined

    const socket = io('/tracking', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    const subscribe = () => {
      socket.emit('track:order', { trackingToken })
    }

    const handleConnect = () => {
      setLiveStatus('connected')
      subscribe()
    }

    const handleDisconnect = () => {
      setLiveStatus('reconnecting')
    }

    const handleConnectError = () => {
      setLiveStatus('reconnecting')
    }

    const handleReconnectAttempt = () => {
      setLiveStatus('reconnecting')
    }

    const handleOrderUpdated = (payload) => {
      setOrder((currentOrder) =>
        currentOrder
          ? {
              ...currentOrder,
              orderStatus: payload.orderStatus ?? currentOrder.orderStatus,
              paymentStatus:
                payload.paymentStatus ?? currentOrder.paymentStatus,
            }
          : currentOrder,
      )
    }

    const handleQueueUpdated = (payload) => {
      setQueue(payload)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect_attempt', handleReconnectAttempt)
    socket.on('order:updated', handleOrderUpdated)
    socket.on('queue:updated', handleQueueUpdated)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect_attempt', handleReconnectAttempt)
      socket.off('order:updated', handleOrderUpdated)
      socket.off('queue:updated', handleQueueUpdated)
      socket.disconnect()
    }
  }, [trackingToken])

  useEffect(() => {
    if (order) {
      document.title = `Queue ${formatQueueNumber(order.queueNumber)} · ${order.restaurant.name}`
    } else {
      document.title = 'Order confirmation · Burger House'
    }
  }, [order])

  function retry() {
    setOrder(null)
    setQueue(null)
    setError('')
    setLoading(true)
    setAttempt((current) => current + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <SiteHeader />
        <main>
          <p role="status" className="sr-only">
            Loading your order…
          </p>
          <ConfirmationSkeleton />
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col bg-cream-50">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
          <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600">
              <BurgerIcon className="size-10" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900">
              We couldn’t load this order.
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              {error ||
                'The order link may be incorrect, or the order no longer exists.'}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center justify-center rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-cream-50 transition hover:bg-ink-700"
              >
                Try again
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-cream-300 px-5 py-3 text-sm font-semibold text-ink-700 transition hover:bg-cream-100"
              >
                Back to menu
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const queueLabel = formatQueueNumber(order.queueNumber)
  const orderTime = formatOrderTime(order.createdAt)
  const itemCount = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  return (
    <div className="min-h-screen bg-cream-50">
      <SiteHeader
        restaurantName={order.restaurant.name}
        logoUrl={order.restaurant.logoUrl}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <section className="relative overflow-hidden rounded-[2rem] border border-cream-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-brand-50" />
          <div className="pointer-events-none absolute -bottom-20 right-24 size-32 rounded-full border-[18px] border-cream-100" />

          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-leaf-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-leaf-700">
              <span className="size-1.5 rounded-full bg-leaf-700" />
              Order received
            </p>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.02] tracking-tight text-ink-900 sm:text-5xl">
              {orderHeading(order)}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ink-500 sm:text-base">
              Keep this page or save the link. Live updates and a refresh button
              are available below.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
              <div className="rounded-2xl bg-ink-900 p-5 text-cream-50 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                  Your queue number
                </p>
                <p className="mt-2 font-display text-[5.5rem] font-semibold leading-none tracking-[-0.06em] text-cream-50 sm:text-[6.5rem]">
                  {queueLabel}
                </p>
                <p className="mt-2 text-xs leading-5 text-cream-200/55">
                  {queueCardHint(order)}
                </p>
              </div>

              <div className="rounded-2xl border border-cream-200 bg-cream-50 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={order.orderStatus} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-ink-500">Order reference</dt>
                    <dd className="text-right font-mono text-xs font-semibold text-ink-900">
                      {order.orderRef}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ink-500">Payment method</dt>
                    <dd className="text-right font-semibold text-ink-900">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                        order.paymentMethod}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ink-500">Order time</dt>
                    <dd className="text-right text-ink-700">{orderTime}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ink-500">Collection</dt>
                    <dd className="text-right text-ink-700">At the counter</dd>
                  </div>
                </dl>
              </div>
            </div>

            <LiveQueuePanel
              order={order}
              queue={queue}
              liveStatus={liveStatus}
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <section
                aria-labelledby="confirmed-items-heading"
                className="rounded-2xl border border-cream-200 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2
                    id="confirmed-items-heading"
                    className="font-display text-xl font-semibold text-ink-900"
                  >
                    Your items
                  </h2>
                  <span className="text-[11px] font-semibold text-ink-400">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <ul className="mt-4 divide-y divide-cream-200">
                  {order.items.map((item, index) => (
                    <li
                      key={`${item.itemName}-${index}`}
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900">
                            {item.quantity} × {item.itemName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-ink-400">
                            {formatRinggit(item.unitPriceSen)} each
                          </p>
                          {item.specialInstructions && (
                            <p className="mt-1.5 rounded-lg bg-cream-50 px-2.5 py-1.5 text-[11px] leading-5 text-ink-500">
                              {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-ink-900">
                          {formatRinggit(
                            item.unitPriceSen * item.quantity,
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                aria-labelledby="confirmed-payment-heading"
                className="rounded-2xl border border-cream-200 p-5"
              >
                <h2
                  id="confirmed-payment-heading"
                  className="font-display text-xl font-semibold text-ink-900"
                >
                  Payment
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <PaymentStatusBadge status={order.paymentStatus} />
                  <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-semibold text-ink-600">
                    {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                      order.paymentMethod}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-ink-500">
                  {paymentGuidance(order)}
                </p>
                {order.paymentIsDemo && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
                    Demo payment only. No real bank charge was made.
                  </p>
                )}

                <div className="mt-5 flex items-baseline justify-between border-t border-cream-200 pt-4">
                  <span className="font-semibold text-ink-900">Total</span>
                  <span className="font-display text-3xl font-semibold tracking-tight text-ink-900">
                    {formatRinggit(order.totalSen)}
                  </span>
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-cream-200 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-ink-400">
                Queue {queueLabel} ·{' '}
                {liveStatus === 'connected'
                  ? 'Live updates connected'
                  : 'Reconnecting live updates'}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-full border border-cream-300 px-4 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-cream-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  Refresh status
                </button>
                <Link
                  to="/"
                  className="rounded-full bg-ink-900 px-4 py-2.5 text-xs font-semibold text-cream-50 transition hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  Back to menu
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter restaurantName={order.restaurant.name} />
    </div>
  )
}
