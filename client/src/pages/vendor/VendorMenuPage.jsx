import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  createVendorMenuItem,
  deleteVendorMenuItem,
  getVendorMenu,
  moveVendorMenuItem,
  updateVendorMenuItem,
  uploadVendorImage,
} from '../../api/vendorMenu'
import { BurgerIcon } from '../../components/customer/BurgerIcon'
import { formatRinggit } from '../../utils/formatCurrency'

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
      <path d="M10 4v12M4 10h12" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 14.5-.5 2 2-.5L15 6.5 13.5 5 4 14.5Z" />
      <path d="m12 6.5 1.5 1.5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h12M8 3.5h4M6 6l.7 10h6.6L14 6M8.5 9v4M11.5 9v4" />
    </svg>
  )
}

function ArrowIcon({ direction }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d={
          direction === 'UP'
            ? 'M10 15V5M5.5 9.5 10 5l4.5 4.5'
            : 'M10 5v10M5.5 10.5 10 15l4.5-4.5'
        }
      />
    </svg>
  )
}

function ImageIcon() {
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
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 5-5 4 4 2.5-2.5L20 18" />
    </svg>
  )
}

function priceToSen(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.')

  if (!/^\d{1,5}(?:\.\d{1,2})?$/.test(normalized)) return null

  const [ringgit, cents = ''] = normalized.split('.')
  const sen = Number(ringgit) * 100 + Number(cents.padEnd(2, '0'))

  if (!Number.isInteger(sen) || sen < 1 || sen > 1_000_000) return null

  return sen
}

function senToPriceInput(priceSen) {
  return (priceSen / 100).toFixed(2)
}

function MenuItemEditor({ item, onCancel, onSaved, onUnauthorized }) {
  const isEditing = Boolean(item)
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(
    item?.priceSen ? senToPriceInput(item.priceSen) : '',
  )
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true)
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? null)
  const [previewUrl, setPreviewUrl] = useState(item?.imageUrl ?? null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [objectUrl, setObjectUrl] = useState('')
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  function chooseImage(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormError(
        'Upload a JPEG, PNG, or WebP image. SVG files are not accepted.',
      )
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFormError('The image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl)

    const nextObjectUrl = URL.createObjectURL(file)
    setObjectUrl(nextObjectUrl)
    setPreviewUrl(nextObjectUrl)
    setSelectedFile(file)
    setRemoveExistingImage(false)
    setFormError('')
  }

  function removePhoto() {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setObjectUrl('')
    setSelectedFile(null)
    setPreviewUrl(null)
    setImageUrl(null)
    setRemoveExistingImage(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    const priceSen = priceToSen(price)

    if (trimmedName.length < 2) {
      setFormError('Enter a menu item name with at least 2 characters.')
      return
    }

    if (trimmedDescription.length < 2) {
      setFormError('Enter a short description for the menu item.')
      return
    }

    if (!priceSen) {
      setFormError('Enter a price in RM, for example 12.50.')
      return
    }

    setSaving(true)

    try {
      let nextImageUrl = removeExistingImage ? null : imageUrl

      if (selectedFile) {
        const upload = await uploadVendorImage(selectedFile, 'menu')
        nextImageUrl = upload.imageUrl
      }

      const payload = {
        name: trimmedName,
        description: trimmedDescription,
        priceSen,
        imageUrl: nextImageUrl,
        isAvailable,
      }

      const result = isEditing
        ? await updateVendorMenuItem(item.id, payload)
        : await createVendorMenuItem(payload)

      onSaved(
        result.items,
        isEditing ? 'Menu item updated.' : 'Menu item added.',
      )
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized()
        return
      }

      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] border border-cream-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            {isEditing ? 'Edit menu item' : 'New menu item'}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">
            {isEditing ? item.name : 'Add something delicious.'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-cream-300 px-3.5 py-2 text-xs font-semibold text-ink-600 transition hover:bg-cream-100 disabled:cursor-wait disabled:opacity-60"
        >
          Cancel
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-cream-200 bg-cream-100">
            <div className="grid size-full place-items-center text-brand-500">
              <BurgerIcon className="size-14" />
            </div>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Menu item photo preview"
                className="absolute inset-0 size-full object-cover"
                onError={(event) => {
                  event.currentTarget.hidden = true
                }}
              />
            )}
          </div>

          <label
            htmlFor="menu-item-photo"
            className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-cream-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-cream-100"
          >
            <ImageIcon />
            {previewUrl ? 'Replace photo' : 'Choose photo'}
          </label>
          <input
            id="menu-item-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={chooseImage}
            className="sr-only"
          />
          <p className="mt-2 text-[10px] leading-4 text-ink-400">
            JPEG, PNG, or WebP. Maximum 5 MB. Leave empty to use the burger
            icon.
          </p>

          {previewUrl && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={saving}
              className="mt-1 text-[10px] font-semibold text-red-700 underline underline-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              Remove photo
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="menu-item-name"
              className="text-xs font-semibold text-ink-700"
            >
              Item name
            </label>
            <input
              id="menu-item-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              disabled={saving}
              placeholder="Burger Cheese"
              className="mt-1.5 w-full rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="menu-item-description"
              className="text-xs font-semibold text-ink-700"
            >
              Description
            </label>
            <textarea
              id="menu-item-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              rows={3}
              disabled={saving}
              placeholder="What makes this burger special?"
              className="mt-1.5 w-full resize-y rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-2.5 text-sm leading-6 text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
            />
            <p className="mt-1 text-right text-[10px] text-ink-400">
              {description.length}/300
            </p>
          </div>

          <div>
            <label
              htmlFor="menu-item-price"
              className="text-xs font-semibold text-ink-700"
            >
              Price
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-xs font-semibold text-ink-500">
                RM
              </span>
              <input
                id="menu-item-price"
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                disabled={saving}
                placeholder="12.50"
                className="w-full rounded-xl border border-cream-300 bg-cream-50 py-2.5 pl-10 pr-3.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
              />
            </div>
            <p className="mt-1 text-[10px] text-ink-400">
              Use up to two decimal places.
            </p>
          </div>

          <div className="flex items-end pb-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-ink-700">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(event) => setIsAvailable(event.target.checked)}
                disabled={saving}
                className="size-4 rounded border-cream-300 text-brand-600 accent-brand-600"
              />
              Available to order
            </label>
          </div>
        </div>
      </div>

      {formError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-800"
        >
          {formError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-cream-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-cream-300 px-4 py-2.5 text-xs font-semibold text-ink-600 transition hover:bg-cream-100 disabled:cursor-wait disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-ink-900 px-5 py-2.5 text-xs font-semibold text-cream-50 transition hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
        >
          {saving
            ? 'Saving…'
            : isEditing
              ? 'Save changes'
              : 'Add menu item'}
        </button>
      </div>
    </form>
  )
}

export default function VendorMenuPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState('')
  const editorRef = useRef(null)

  const loadMenu = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getVendorMenu()
      setItems(result.items)
    } catch (requestError) {
      if (requestError.status === 401) {
        navigate('/vendor/login', { replace: true })
        return
      }

      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    let active = true

    getVendorMenu()
      .then((result) => {
        if (!active) return
        setItems(result.items)
        setError('')
      })
      .catch((requestError) => {
        if (!active) return

        if (requestError.status === 401) {
          navigate('/vendor/login', { replace: true })
          return
        }

        setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [navigate])

  useEffect(() => {
    document.title = 'Menu management · Vendor dashboard'
  }, [])

  useEffect(() => {
    if (!notice) return

    const timeout = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function showNotice(message) {
    setNotice({ message, nonce: Date.now() })
  }

  function handleApiError(requestError) {
    if (requestError.status === 401) {
      navigate('/vendor/login', { replace: true })
      return
    }

    setError(requestError.message)
  }

  function openEditor(item = null) {
    setError('')
    setDeleteConfirmId('')
    setEditor({ item })

    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)
  }

  async function handleDelete(item) {
    if (busy) return

    setBusy({ itemId: item.id, action: 'delete' })
    setError('')

    try {
      const result = await deleteVendorMenuItem(item.id)
      setItems(result.items)
      setDeleteConfirmId('')

      if (editor?.item?.id === item.id) {
        setEditor(null)
      }

      showNotice('Menu item deleted.')
    } catch (requestError) {
      handleApiError(requestError)
    } finally {
      setBusy(null)
    }
  }

  async function handleAvailability(item) {
    if (busy) return

    setBusy({ itemId: item.id, action: 'availability' })
    setError('')

    try {
      const result = await updateVendorMenuItem(item.id, {
        isAvailable: !item.isAvailable,
      })
      setItems(result.items)
      showNotice(
        item.isAvailable
          ? `${item.name} marked as sold out.`
          : `${item.name} is available again.`,
      )
    } catch (requestError) {
      handleApiError(requestError)
    } finally {
      setBusy(null)
    }
  }

  async function handleMove(item, direction) {
    if (busy) return

    setBusy({ itemId: item.id, action: `move-${direction}` })
    setError('')

    try {
      const result = await moveVendorMenuItem(item.id, direction)
      setItems(result.items)
      showNotice('Menu order updated.')
    } catch (requestError) {
      handleApiError(requestError)
    } finally {
      setBusy(null)
    }
  }

  function handleSaved(nextItems, message) {
    setItems(nextItems)
    setEditor(null)
    showNotice(message)
  }

  const availableCount = items.filter((item) => item.isAvailable).length
  const soldOutCount = items.length - availableCount

  return (
    <div>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
            Menu management
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Build the menu.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">
            Add new burgers, update prices and photos, reorder the list, or mark
            items sold out. Customers see changes the next time the menu loads.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-cream-300 bg-white px-4 py-3 text-xs font-semibold text-ink-700 transition hover:bg-cream-100"
          >
            View customer menu
          </Link>
          <button
            type="button"
            onClick={() => openEditor()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-xs font-semibold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600"
          >
            <PlusIcon />
            Add menu item
          </button>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className="mt-5 rounded-2xl border border-leaf-700/15 bg-leaf-100 px-4 py-3 text-xs font-semibold text-leaf-700"
        >
          {notice.message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-800"
        >
          <span>{error}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadMenu}
              className="rounded-full bg-red-900 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-red-950"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => setError('')}
              className="rounded-full border border-red-300 px-3 py-1.5 text-[10px] font-semibold text-red-800 transition hover:bg-red-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {editor && (
        <div ref={editorRef} className="mt-6 scroll-mt-24">
          <MenuItemEditor
            key={editor.item?.id ?? 'new-item'}
            item={editor.item}
            onCancel={() => setEditor(null)}
            onSaved={handleSaved}
            onUnauthorized={() =>
              navigate('/vendor/login', { replace: true })
            }
          />
        </div>
      )}

      <section aria-label="Menu items" className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.06em]">
            <span className="rounded-full bg-white px-3 py-1.5 text-ink-500 ring-1 ring-cream-200">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
            <span className="rounded-full bg-leaf-100 px-3 py-1.5 text-leaf-700">
              {availableCount} available
            </span>
            {soldOutCount > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">
                {soldOutCount} sold out
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-400">
            Use the arrows to change the order on the customer menu.
          </p>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-[1.5rem] border border-cream-200 bg-white"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4 rounded-[1.5rem] border border-cream-200 bg-white px-6 py-14 text-center shadow-sm">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-cream-100 text-brand-500">
              <BurgerIcon className="size-8" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink-900">
              The menu is empty.
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">
              Add your first menu item so customers can order.
            </p>
            <button
              type="button"
              onClick={() => openEditor()}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-xs font-semibold text-white transition hover:bg-brand-600"
            >
              <PlusIcon />
              Add menu item
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {items.map((item, index) => {
              const isBusy = busy?.itemId === item.id
              const busyAction = isBusy ? busy.action : ''

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[1.5rem] border border-cream-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-cream-100">
                    <div className="grid size-full place-items-center text-brand-500">
                      <BurgerIcon className="size-12" />
                    </div>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={`${item.name} menu photo`}
                        className={`absolute inset-0 size-full object-cover ${
                          item.isAvailable ? '' : 'grayscale opacity-60'
                        }`}
                        onError={(event) => {
                          event.currentTarget.hidden = true
                        }}
                      />
                    )}

                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-500 shadow-sm backdrop-blur">
                      Menu no. {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] shadow-sm backdrop-blur ${
                        item.isAvailable
                          ? 'bg-leaf-100/95 text-leaf-700'
                          : 'bg-ink-900/90 text-cream-50'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          item.isAvailable ? 'bg-leaf-700' : 'bg-red-300'
                        }`}
                      />
                      {item.isAvailable ? 'Available' : 'Sold out'}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-2xl font-semibold text-ink-900">
                          {item.name}
                        </h2>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-500">
                          {item.description}
                        </p>
                      </div>
                      <p className="shrink-0 font-display text-xl font-semibold text-ink-900">
                        {formatRinggit(item.priceSen)}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cream-200 pt-4">
                      <button
                        type="button"
                        onClick={() => openEditor(item)}
                        disabled={Boolean(busy)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3 py-2 text-[10px] font-semibold text-ink-700 transition hover:bg-cream-100 disabled:cursor-wait disabled:opacity-60"
                      >
                        <PencilIcon />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAvailability(item)}
                        disabled={Boolean(busy)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                          item.isAvailable
                            ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'bg-leaf-700 text-white hover:bg-leaf-700/90'
                        }`}
                      >
                        {busyAction === 'availability'
                          ? 'Updating…'
                          : item.isAvailable
                            ? 'Mark sold out'
                            : 'Mark available'}
                      </button>

                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(item, 'UP')}
                          disabled={Boolean(busy) || index === 0}
                          aria-label={`Move ${item.name} up`}
                          className="grid size-8 place-items-center rounded-full border border-cream-300 bg-white text-ink-500 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <ArrowIcon direction="UP" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(item, 'DOWN')}
                          disabled={
                            Boolean(busy) || index === items.length - 1
                          }
                          aria-label={`Move ${item.name} down`}
                          className="grid size-8 place-items-center rounded-full border border-cream-300 bg-white text-ink-500 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <ArrowIcon direction="DOWN" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(item.id)}
                          disabled={Boolean(busy)}
                          aria-label={`Delete ${item.name}`}
                          className="grid size-8 place-items-center rounded-full border border-red-200 bg-white text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {deleteConfirmId === item.id && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-[11px] font-semibold text-red-900">
                          Delete “{item.name}”?
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-red-700">
                          It will disappear from the customer menu. Existing
                          orders keep their own saved item details.
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={Boolean(busy)}
                            className="rounded-full bg-red-900 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-red-950 disabled:cursor-wait disabled:opacity-60"
                          >
                            {busyAction === 'delete'
                              ? 'Deleting…'
                              : 'Delete item'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId('')}
                            disabled={Boolean(busy)}
                            className="rounded-full border border-red-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
