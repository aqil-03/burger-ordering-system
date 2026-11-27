import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from '../../constants/payment'

export default function PaymentStatusBadge({ status, className = '' }) {
  const label = PAYMENT_STATUS_LABELS[status] || status || 'Unknown'
  const tone =
    PAYMENT_STATUS_TONES[status] || 'bg-cream-200 text-ink-600'

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${tone} ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}
