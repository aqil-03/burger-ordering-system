import {
  MAX_CART_ITEM_QUANTITY,
  MAX_INSTRUCTIONS_LENGTH,
} from '../../context/cart'
import { formatRinggit } from '../../utils/formatCurrency'
import { BurgerIcon } from './BurgerIcon'

function MinusIcon() {
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
      <path d="M5 10h10" />
    </svg>
  )
}

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

function TrashIcon() {
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
      <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  )
}

export default function CartLineItem({
  line,
  onQuantityChange,
  onRemove,
  onInstructionsChange,
}) {
  const menuItem = line.menuItem
  const isAvailable = Boolean(menuItem?.isAvailable)
  const canAdjust = Boolean(menuItem) && isAvailable
  const itemName = menuItem?.name ?? 'Unavailable menu item'
  const instructionsId = `instructions-${line.menuItemId}`
  const lineTotalSen = menuItem ? menuItem.priceSen * line.quantity : 0

  const unavailableMessage = !menuItem
    ? 'This item is no longer on the menu. Remove it to continue.'
    : !isAvailable
      ? 'This item is sold out. Remove it to continue.'
      : ''

  return (
    <article
      className={`rounded-[1.5rem] border bg-white p-4 shadow-sm sm:p-5 ${
        isAvailable ? 'border-cream-200' : 'border-red-200'
      }`}
    >
      <div className="flex gap-4">
        <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-cream-100 sm:size-28">
          {menuItem?.imageUrl ? (
            <img
              src={menuItem.imageUrl}
              alt={itemName}
              className={`size-full object-cover ${
                isAvailable ? '' : 'grayscale opacity-60'
              }`}
            />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-brand-50 to-cream-100 text-brand-500">
              <BurgerIcon className="size-9" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                {isAvailable ? 'In your cart' : 'Needs attention'}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-2xl">
                {itemName}
              </h2>
              {menuItem && (
                <p className="mt-1 text-xs text-ink-500">
                  {formatRinggit(menuItem.priceSen)} each
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onRemove(line.menuItemId)}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-cream-200 text-ink-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              aria-label={`Remove ${itemName} from cart`}
            >
              <TrashIcon />
            </button>
          </div>

          {unavailableMessage && (
            <p className="mt-2 text-xs font-medium leading-5 text-red-700">
              {unavailableMessage}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-full border border-cream-300 bg-white">
              <button
                type="button"
                onClick={() =>
                  onQuantityChange(line.menuItemId, line.quantity - 1)
                }
                disabled={!canAdjust || line.quantity <= 1}
                className="grid size-10 place-items-center rounded-full text-ink-700 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                aria-label={`Decrease ${itemName} quantity`}
              >
                <MinusIcon />
              </button>
              <span
                className="min-w-7 text-center text-sm font-semibold text-ink-900"
                aria-live="polite"
              >
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  onQuantityChange(line.menuItemId, line.quantity + 1)
                }
                disabled={
                  !canAdjust || line.quantity >= MAX_CART_ITEM_QUANTITY
                }
                className="grid size-10 place-items-center rounded-full text-ink-700 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                aria-label={`Increase ${itemName} quantity`}
              >
                <PlusIcon />
              </button>
            </div>

            {menuItem && (
              <p className="text-sm font-bold text-ink-900">
                {formatRinggit(lineTotalSen)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-cream-200 pt-4">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={instructionsId}
            className="text-xs font-semibold text-ink-700"
          >
            Special instructions
          </label>
          <span className="text-[10px] text-ink-400">
            {line.specialInstructions.length}/{MAX_INSTRUCTIONS_LENGTH}
          </span>
        </div>
        <textarea
          id={instructionsId}
          value={line.specialInstructions}
          onChange={(event) =>
            onInstructionsChange(line.menuItemId, event.target.value)
          }
          disabled={!canAdjust}
          rows={2}
          maxLength={MAX_INSTRUCTIONS_LENGTH}
          placeholder="No onions, extra sauce…"
          className="mt-2 w-full resize-y rounded-xl border border-cream-300 bg-cream-50/60 px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p className="mt-1.5 text-[11px] text-ink-400">
          Optional. Applied to all {line.quantity}{' '}
          {line.quantity === 1 ? 'burger' : 'burgers'} of this item.
        </p>
      </div>
    </article>
  )
}
