import { MAX_CART_ITEM_QUANTITY } from '../../context/cart'
import { formatRinggit } from '../../utils/formatCurrency'
import { BurgerIcon } from './BurgerIcon'

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M10 5v10M5 10h10" />
    </svg>
  )
}

export default function MenuItemCard({
  item,
  index,
  quantityInCart = 0,
  onAddToCart,
}) {
  const isAvailable = item.isAvailable
  const atLimit = quantityInCart >= MAX_CART_ITEM_QUANTITY
  const addDisabled = !isAvailable || atLimit

  let buttonLabel = 'Add to cart'
  if (!isAvailable) buttonLabel = 'Sold out'
  else if (atLimit) buttonLabel = 'Max 20'
  else if (quantityInCart > 0) buttonLabel = 'Add another'

  const buttonAriaLabel = !isAvailable
    ? `${item.name} is sold out`
    : atLimit
      ? `Maximum quantity reached for ${item.name}`
      : `Add ${item.name} to cart`

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-cream-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink-900/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-100">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={`${item.name} served on a toasted bun`}
            decoding="async"
            className={`size-full object-cover transition duration-500 group-hover:scale-[1.03] ${
              isAvailable ? '' : 'grayscale opacity-60'
            }`}
          />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-brand-50 to-cream-100">
            <span className="grid size-20 place-items-center rounded-3xl bg-white/80 text-brand-500 shadow-sm">
              <BurgerIcon className="size-12" />
            </span>
          </div>
        )}

        <span
          className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] shadow-sm backdrop-blur ${
            isAvailable
              ? 'bg-white/95 text-leaf-700'
              : 'bg-ink-900/90 text-cream-50'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              isAvailable ? 'bg-leaf-700' : 'bg-red-300'
            }`}
          />
          {isAvailable ? 'Available' : 'Sold out'}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
          Menu no. {String(index + 1).padStart(2, '0')}
        </p>
        <h3 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink-900">
          {item.name}
        </h3>
        <p className="mt-2.5 text-sm leading-6 text-ink-500">
          {item.description}
        </p>

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-cream-200 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Price
            </p>
            <p className="mt-0.5 whitespace-nowrap font-display text-2xl font-semibold text-ink-900">
              {formatRinggit(item.priceSen)}
            </p>
            <p
              className={`mt-0.5 text-[11px] ${
                quantityInCart > 0
                  ? 'font-semibold text-brand-600'
                  : 'text-ink-400'
              }`}
            >
              {quantityInCart > 0
                ? `${quantityInCart} in cart`
                : 'Made fresh to order'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onAddToCart(item)}
            disabled={addDisabled}
            aria-label={buttonAriaLabel}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
              addDisabled
                ? 'cursor-not-allowed bg-cream-100 text-ink-400'
                : 'bg-brand-500 text-white shadow-sm shadow-brand-500/20 hover:bg-brand-600'
            }`}
          >
            {buttonLabel}
            {!addDisabled && <PlusIcon />}
          </button>
        </div>
      </div>
    </article>
  )
}
