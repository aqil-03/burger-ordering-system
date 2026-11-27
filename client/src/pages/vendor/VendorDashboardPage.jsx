import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getVendorDashboard } from '../../api/vendor'
import VendorOrderCard from '../../components/vendor/VendorOrderCard'

const FALLBACK_REFRESH_MS = 30000
const ACTIVE_ORDER_STATUSES = ['WAITING', 'PREPARING', 'READY']

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
]

function formatQueueDate(value) {
  const date = new Date(`${value}T12:00:00+08:00`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
  }).format(date)
}

function formatTime(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

function matchesFilter(order, filter) {
  if (filter === 'all') return true
  if (filter === 'active') {
    return ACTIVE_ORDER_STATUSES.includes(order.orderStatus)
  }

  return order.orderStatus === filter.toUpperCase()
}

function countForFilter(data, filter) {
  if (!data) return 0

  const stats = data.stats

  if (filter === 'all') return stats.total
  if (filter === 'active') {
    return stats.waiting + stats.preparing + stats.ready
  }

  return stats[filter] ?? 0
}

function StatCard({ label, value, tone = 'cream' }) {
  const tones = {
    cream: 'border-cream-200 bg-white text-ink-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    brand: 'border-brand-100 bg-brand-50 text-brand-600',
    leaf: 'border-leaf-100 bg-leaf-100/60 text-leaf-700',
    red: 'border-red-200 bg-red-50 text-red-800',
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
        {label}
      </p>
    </div>
  )
}

function RefreshIcon({ spinning = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`size-4 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 11a8.1 8.1 0 0 0-14.9-4M4 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 14.9 4M20 20v-5h-5" />
    </svg>
  )
}

function SoundIcon({ enabled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10v4h3l4 3V7L8 10H5Z" />
      {enabled ? (
        <>
          <path d="M16 9.5a4 4 0 0 1 0 5" />
          <path d="M18.5 7a7.5 7.5 0 0 1 0 10" />
        </>
      ) : (
        <path d="m16 10 4 4M20 10l-4 4" />
      )}
    </svg>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-28 rounded-full bg-cream-200" />
      <div className="mt-3 h-10 w-64 rounded-lg bg-cream-200" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 rounded-2xl bg-white" />
        ))}
      </div>
      <div className="mt-6 h-12 w-full rounded-2xl bg-white" />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-72 rounded-[1.5rem] bg-white" />
        ))}
      </div>
    </div>
  )
}

export default function VendorDashboardPage() {
  const { vendor } = useOutletContext() ?? {}
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [liveStatus, setLiveStatus] = useState('connecting')
  const [filter, setFilter] = useState('active')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const seenOrderRefsRef = useRef(null)
  const soundEnabledRef = useRef(false)
  const audioContextRef = useRef(null)
  const mountedRef = useRef(true)
  const latestRequestRef = useRef(0)

  const playNotificationTone = useCallback(() => {
    const context = audioContextRef.current
    if (!context) return

    try {
      const play = () => {
        const now = context.currentTime
        const notes = [880, 660]

        notes.forEach((frequency, index) => {
          const oscillator = context.createOscillator()
          const gain = context.createGain()
          const start = now + index * 0.13
          const end = start + 0.12

          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(frequency, start)
          gain.gain.setValueAtTime(0.0001, start)
          gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.0001, end)
          oscillator.connect(gain)
          gain.connect(context.destination)
          oscillator.start(start)
          oscillator.stop(end)
        })
      }

      if (context.state === 'suspended') {
        context.resume().then(play).catch(() => {})
      } else {
        play()
      }
    } catch {
      // Notification sound is optional.
    }
  }, [])

  const handleNewOrders = useCallback(
    (orders) => {
      const currentRefs = new Set(orders.map((order) => order.orderRef))

      if (
        seenOrderRefsRef.current &&
        soundEnabledRef.current &&
        orders.some((order) => !seenOrderRefsRef.current.has(order.orderRef))
      ) {
        playNotificationTone()
      }

      seenOrderRefsRef.current = currentRefs
    },
    [playNotificationTone],
  )

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = latestRequestRef.current + 1
      latestRequestRef.current = requestId

      if (!silent) setRefreshing(true)

      try {
        const result = await getVendorDashboard()

        if (
          !mountedRef.current ||
          requestId !== latestRequestRef.current
        ) {
          return
        }

        setData(result)
        setError('')
        setLastUpdated(new Date())
        handleNewOrders(result.orders)
      } catch (requestError) {
        if (
          !mountedRef.current ||
          requestId !== latestRequestRef.current
        ) {
          return
        }

        if (requestError.status === 401) {
          navigate('/vendor/login', { replace: true })
          return
        }

        setError(requestError.message)
      } finally {
        if (
          mountedRef.current &&
          requestId === latestRequestRef.current
        ) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [handleNewOrders, navigate],
  )

  useEffect(() => {
    mountedRef.current = true

    // Defer the first request so the effect is only responsible for setting up
    // polling, not for triggering an immediate render-phase state cascade.
    const initialFetch = window.setTimeout(() => {
      loadDashboard({ silent: true })
    }, 0)

    const interval = window.setInterval(() => {
      loadDashboard({ silent: true })
    }, FALLBACK_REFRESH_MS)

    return () => {
      mountedRef.current = false
      window.clearTimeout(initialFetch)
      window.clearInterval(interval)

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    }
  }, [loadDashboard])

  useEffect(() => {
    document.title = 'Incoming orders · Vendor dashboard'
  }, [])

  useEffect(() => {
    const socket = io('/vendor', {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    const handleConnect = () => {
      setLiveStatus('connected')
      loadDashboard({ silent: true })
    }

    const handleDisconnect = () => {
      setLiveStatus('reconnecting')
    }

    const handleConnectError = (socketError) => {
      if (socketError?.message === 'unauthorized') {
        navigate('/vendor/login', { replace: true })
        return
      }

      setLiveStatus('reconnecting')
    }

    const handleReconnectAttempt = () => {
      setLiveStatus('reconnecting')
    }

    const handleOrdersChanged = () => {
      loadDashboard({ silent: true })
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect_attempt', handleReconnectAttempt)
    socket.on('orders:changed', handleOrdersChanged)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect_attempt', handleReconnectAttempt)
      socket.off('orders:changed', handleOrdersChanged)
      socket.disconnect()
    }
  }, [loadDashboard, navigate])

  function toggleSound() {
    const nextValue = !soundEnabled
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext

    if (nextValue && !AudioContextClass) return

    if (nextValue && !audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContextClass()
      } catch {
        return
      }
    }

    setSoundEnabled(nextValue)
    soundEnabledRef.current = nextValue

    if (nextValue) {
      playNotificationTone()
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-6">
        <h1 className="font-display text-2xl font-semibold text-red-950">
          The dashboard could not be loaded.
        </h1>
        <p className="mt-2 text-sm leading-6 text-red-800">
          {error || 'Please retry. If the problem continues, sign in again.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError('')
              loadDashboard()
            }}
            className="rounded-full bg-red-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-950"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => navigate('/vendor/login', { replace: true })}
            className="rounded-full border border-red-300 bg-white px-4 py-2.5 text-xs font-semibold text-red-800 transition hover:bg-red-100"
          >
            Sign in again
          </button>
        </div>
      </div>
    )
  }

  const filteredOrders = data.orders.filter((order) =>
    matchesFilter(order, filter),
  )
  const stats = data.stats

  return (
    <div>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
            Vendor dashboard
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Incoming orders.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">
            Welcome back, {vendor?.name || data.vendor?.name || 'vendor'}.
            Business day {formatQueueDate(data.queueDate)} · Live order updates
            when connected.
          </p>
          {data.nextEligibleQueueNumber && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-600">
              <span className="size-1.5 rounded-full bg-brand-500" />
              Next eligible queue{' '}
              {String(data.nextEligibleQueueNumber).padStart(3, '0')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-ink-400">
            Last updated {formatTime(lastUpdated)}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.07em] ${
              liveStatus === 'connected'
                ? 'bg-leaf-100 text-leaf-700'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                liveStatus === 'connected'
                  ? 'bg-leaf-700'
                  : 'animate-pulse bg-amber-600'
              }`}
            />
            {liveStatus === 'connected'
              ? 'Live'
              : liveStatus === 'connecting'
                ? 'Connecting'
                : 'Reconnecting'}
          </span>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundEnabled}
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-cream-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <SoundIcon enabled={soundEnabled} />
            Sound {soundEnabled ? 'on' : 'off'}
          </button>
          <button
            type="button"
            onClick={() => loadDashboard()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3.5 py-2.5 text-xs font-semibold text-cream-50 transition hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <RefreshIcon spinning={refreshing} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"
        >
          Latest refresh failed: {error} The previous orders are still shown.
        </div>
      )}

      <section
        aria-label="Order statistics"
        className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      >
        <StatCard label="Waiting" value={stats.waiting} tone="amber" />
        <StatCard label="Preparing" value={stats.preparing} tone="brand" />
        <StatCard label="Ready" value={stats.ready} tone="leaf" />
        <StatCard
          label="Pending payments"
          value={stats.pendingPayments}
          tone="red"
        />
        <StatCard
          label="Completed today"
          value={stats.completed}
          tone="cream"
        />
      </section>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
              filter === item.id
                ? 'bg-ink-900 text-cream-50'
                : 'border border-cream-200 bg-white text-ink-500 hover:bg-cream-100'
            }`}
          >
            {item.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                filter === item.id
                  ? 'bg-white/15 text-cream-100'
                  : 'bg-cream-100 text-ink-500'
              }`}
            >
              {countForFilter(data, item.id)}
            </span>
          </button>
        ))}
      </div>

      <section aria-label="Orders" className="mt-5">
        {filteredOrders.length === 0 ? (
          <div className="rounded-[1.5rem] border border-cream-200 bg-white px-6 py-14 text-center shadow-sm">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-cream-100 text-ink-400">
              <span className="font-display text-2xl">0</span>
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink-900">
              No orders in this view.
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">
              New orders will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredOrders.map((order) => (
              <VendorOrderCard
                key={order.id}
                order={order}
                isNextEligible={order.id === data.nextEligibleOrderId}
                maxPreparing={data.maxPreparing ?? 1}
                preparingCount={stats.preparing}
                onRefresh={loadDashboard}
                onUnauthorized={() =>
                  navigate('/vendor/login', { replace: true })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
