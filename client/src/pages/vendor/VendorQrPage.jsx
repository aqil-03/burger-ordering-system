import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  getMenuQrCode,
  getVendorPaymentSettings,
  updateVendorPaymentQr,
  uploadVendorImage,
} from '../../api/vendorMenu'
import { BurgerIcon } from '../../components/customer/BurgerIcon'

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3v10M6 9l4 4 4-4M4 16.5h12" />
    </svg>
  )
}

function PrinterIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 7V3.5h8V7M6 14H4.5A1.5 1.5 0 0 1 3 12.5v-4A1.5 1.5 0 0 1 4.5 7h11A1.5 1.5 0 0 1 17 8.5v4a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M6 11h8v5.5H6z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="7" width="9" height="10" rx="2" />
      <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13V3M6 7l4-4 4 4M4 16.5h12" />
    </svg>
  )
}

function fileSlug(value) {
  return (
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'burger-house'
  )
}

export default function VendorQrPage() {
  const navigate = useNavigate()
  const [menuUrlInput, setMenuUrlInput] = useState(
    `${window.location.origin}/`,
  )
  const [qr, setQr] = useState(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [qrError, setQrError] = useState('')
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState(null)

  const [payment, setPayment] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState('')
  const [paymentFile, setPaymentFile] = useState(null)
  const [paymentPreview, setPaymentPreview] = useState('')
  const [paymentObjectUrl, setPaymentObjectUrl] = useState('')
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  useEffect(() => {
    let active = true

    getMenuQrCode({ url: `${window.location.origin}/` })
      .then((result) => {
        if (!active) return
        setQr(result)
        setMenuUrlInput(result.menuUrl)
        setQrError('')
      })
      .catch((requestError) => {
        if (!active) return

        if (requestError.status === 401) {
          navigate('/vendor/login', { replace: true })
          return
        }

        setQrError(requestError.message)
      })
      .finally(() => {
        if (active) setQrLoading(false)
      })

    getVendorPaymentSettings()
      .then((result) => {
        if (!active) return
        setPayment(result.payment)
        setPaymentError('')
      })
      .catch((requestError) => {
        if (!active) return

        if (requestError.status === 401) {
          navigate('/vendor/login', { replace: true })
          return
        }

        setPaymentError(requestError.message)
      })
      .finally(() => {
        if (active) setPaymentLoading(false)
      })

    return () => {
      active = false
    }
  }, [navigate])

  useEffect(() => {
    document.title = 'QR codes · Vendor dashboard'
    document.body.classList.add('qr-print-page')

    return () => {
      document.body.classList.remove('qr-print-page')
    }
  }, [])

  useEffect(() => {
    if (!notice) return

    const timeout = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    if (!copied) return

    const timeout = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(timeout)
  }, [copied])

  useEffect(() => {
    return () => {
      if (paymentObjectUrl) URL.revokeObjectURL(paymentObjectUrl)
    }
  }, [paymentObjectUrl])

  function showNotice(message) {
    setNotice({ message, nonce: Date.now() })
  }

  function handleError(requestError, setter) {
    if (requestError.status === 401) {
      navigate('/vendor/login', { replace: true })
      return
    }

    setter(requestError.message)
  }

  async function generateQrCode(url) {
    if (!String(url ?? '').trim()) {
      setQrError('Enter the customer menu link first.')
      return
    }

    setQrLoading(true)
    setQrError('')
    setCopied(false)

    try {
      const result = await getMenuQrCode({ url })
      setQr(result)
      setMenuUrlInput(result.menuUrl)
    } catch (requestError) {
      handleError(requestError, setQrError)
    } finally {
      setQrLoading(false)
    }
  }

  function handleGenerate(event) {
    event.preventDefault()
    generateQrCode(menuUrlInput)
  }

  function downloadPng() {
    if (!qr) return

    const link = document.createElement('a')
    link.href = qr.pngDataUrl
    link.download = `${fileSlug(qr.restaurantName)}-menu-qr.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function downloadSvg() {
    if (!qr) return

    const blob = new Blob([qr.svg], { type: 'image/svg+xml' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `${fileSlug(qr.restaurantName)}-menu-qr.svg`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  async function copyMenuLink() {
    if (!qr) return

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }

      await navigator.clipboard.writeText(qr.menuUrl)
      setCopied(true)
    } catch {
      setQrError(
        'Could not copy automatically. Select the menu link and copy it manually.',
      )
    }
  }

  function choosePaymentFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPaymentError(
        'Upload a JPEG, PNG, or WebP image. SVG files are not accepted.',
      )
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setPaymentError('The image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    if (paymentObjectUrl) URL.revokeObjectURL(paymentObjectUrl)

    const nextObjectUrl = URL.createObjectURL(file)
    setPaymentObjectUrl(nextObjectUrl)
    setPaymentPreview(nextObjectUrl)
    setPaymentFile(file)
    setPaymentError('')
    setResetConfirm(false)
  }

  function clearPaymentFile() {
    if (paymentObjectUrl) URL.revokeObjectURL(paymentObjectUrl)

    setPaymentObjectUrl('')
    setPaymentPreview('')
    setPaymentFile(null)

    const input = document.getElementById('duitnow-qr-file')
    if (input) input.value = ''
  }

  async function replacePaymentQr() {
    if (!paymentFile || paymentBusy) return

    setPaymentBusy(true)
    setPaymentError('')

    try {
      const upload = await uploadVendorImage(paymentFile, 'payment')
      const result = await updateVendorPaymentQr({
        duitnowQrUrl: upload.imageUrl,
        duitnowQrIsDemo: false,
      })
      setPayment(result.payment)
      clearPaymentFile()
      showNotice('DuitNow payment QR replaced. Customer checkout will use it.')
    } catch (requestError) {
      handleError(requestError, setPaymentError)
    } finally {
      setPaymentBusy(false)
    }
  }

  async function restoreDemoQr() {
    if (!payment || paymentBusy) return

    setPaymentBusy(true)
    setPaymentError('')

    try {
      const result = await updateVendorPaymentQr({
        duitnowQrUrl:
          payment.demoQrUrl ?? '/payment/duitnow-demo.svg',
        duitnowQrIsDemo: true,
      })
      setPayment(result.payment)
      clearPaymentFile()
      setResetConfirm(false)
      showNotice('Demo DuitNow QR restored.')
    } catch (requestError) {
      handleError(requestError, setPaymentError)
    } finally {
      setPaymentBusy(false)
    }
  }

  return (
    <div>
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
          QR codes
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
          Share the menu.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">
          Generate a QR code that opens the customer menu, then download it for
          a table stand. You can also replace the demo DuitNow payment QR with
          your real one.
        </p>
      </header>

      {notice && (
        <div
          role="status"
          className="mt-5 rounded-2xl border border-leaf-700/15 bg-leaf-100 px-4 py-3 text-xs font-semibold text-leaf-700"
        >
          {notice.message}
        </div>
      )}

      <section className="mt-6 rounded-[1.5rem] border border-cream-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink-900">
              Customer menu QR
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-500">
              This QR code opens the menu link below. If you are testing from a
              phone, use your computer’s Wi-Fi address — not{' '}
              <span className="font-mono text-[11px]">localhost</span>.
            </p>

            <form onSubmit={handleGenerate} className="mt-5">
              <label
                htmlFor="menu-qr-link"
                className="text-xs font-semibold text-ink-700"
              >
                Menu link
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="menu-qr-link"
                  type="text"
                  value={menuUrlInput}
                  onChange={(event) => setMenuUrlInput(event.target.value)}
                  disabled={qrLoading}
                  spellCheck="false"
                  className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={qrLoading}
                  className="rounded-xl bg-ink-900 px-5 py-2.5 text-xs font-semibold text-cream-50 transition hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {qrLoading ? 'Generating…' : 'Generate QR'}
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-ink-400">
                Include <span className="font-mono">http://</span> or{' '}
                <span className="font-mono">https://</span>. For example,
                http://192.168.1.20:5173/
              </p>
            </form>

            {qrError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-800"
              >
                {qrError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadPng}
                disabled={!qr || qrLoading}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadIcon />
                Download PNG
              </button>
              <button
                type="button"
                onClick={downloadSvg}
                disabled={!qr || qrLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadIcon />
                Download SVG
              </button>
              <button
                type="button"
                onClick={copyMenuLink}
                disabled={!qr || qrLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CopyIcon />
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!qr || qrLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PrinterIcon />
                Print poster
              </button>
            </div>
          </div>

          <div className="qr-print-area overflow-hidden rounded-[2rem] border border-cream-200 bg-white shadow-lg shadow-ink-900/10">
            <div className="bg-ink-900 px-6 py-7 text-center text-cream-50">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-brand-300">
                {qr?.restaurantName ?? 'Burger House'}
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
                Scan to order
              </p>
              <p className="mt-1.5 text-[11px] text-cream-200/60">
                Fresh burgers · Live queue
              </p>
            </div>
            <div className="p-6 text-center">
              {qr ? (
                <img
                  src={qr.pngDataUrl}
                  alt={`QR code linking to ${qr.menuUrl}`}
                  className="mx-auto w-full max-w-[260px]"
                />
              ) : (
                <div className="mx-auto grid aspect-square w-full max-w-[260px] animate-pulse place-items-center rounded-2xl bg-cream-100 text-brand-500">
                  <BurgerIcon className="size-16" />
                </div>
              )}
              <p className="mt-4 text-xs leading-5 text-ink-500">
                Open your phone camera and scan the code.
              </p>
              <p className="mt-2 break-all font-mono text-[9px] leading-4 text-ink-400">
                {qr?.menuUrl ?? menuUrlInput}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-cream-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <div>
            <div className="rounded-2xl border border-cream-200 bg-white p-3 shadow-sm">
              {paymentLoading ? (
                <div className="grid aspect-square animate-pulse place-items-center rounded-lg bg-cream-100 text-ink-400">
                  Loading…
                </div>
              ) : payment?.duitnowQrUrl ? (
                <img
                  src={payment.duitnowQrUrl}
                  alt="Current DuitNow payment QR code"
                  className="w-full rounded-lg"
                />
              ) : (
                <p className="p-8 text-center text-xs text-ink-500">
                  No DuitNow QR configured.
                </p>
              )}
            </div>
            {payment && (
              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] ${
                  payment.duitnowQrIsDemo
                    ? 'bg-red-100 text-red-800'
                    : 'bg-leaf-100 text-leaf-700'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    payment.duitnowQrIsDemo
                      ? 'bg-red-600'
                      : 'bg-leaf-700'
                  }`}
                />
                {payment.duitnowQrIsDemo ? 'Demo QR' : 'Real QR configured'}
              </span>
            )}
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-ink-900">
              DuitNow payment QR
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Customer checkout shows this image when DuitNow is selected.
              Upload the QR image exported from your official DuitNow or banking
              app. The customer still remains Pending Verification until you
              confirm the payment.
            </p>

            {payment && payment.duitnowQrIsDemo && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-5 text-red-800">
                <p className="font-bold">Demo QR active.</p>
                <p className="mt-1">
                  This image is not connected to DuitNow. Replace it before
                  accepting real payments.
                </p>
              </div>
            )}

            {payment && !payment.duitnowQrIsDemo && (
              <div className="mt-4 rounded-xl border border-leaf-700/15 bg-leaf-100 p-3.5 text-xs leading-5 text-leaf-700">
                <p className="font-bold">Real DuitNow QR configured.</p>
                <p className="mt-1">
                  Scan the image yourself before going live to confirm it opens
                  your correct payment account.
                </p>
              </div>
            )}

            {paymentError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-800"
              >
                {paymentError}
              </p>
            )}

            {paymentLoading ? (
              <div className="mt-4 h-24 animate-pulse rounded-xl bg-cream-100" />
            ) : (
              <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink-900">
                      {paymentFile
                        ? `Selected: ${paymentFile.name}`
                        : 'Replace with your real QR image'}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-ink-400">
                      JPEG, PNG, or WebP · maximum 5 MB · SVG not accepted.
                    </p>
                  </div>
                  <label
                    htmlFor="duitnow-qr-file"
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-cream-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-cream-100"
                  >
                    <UploadIcon />
                    Choose image
                  </label>
                  <input
                    id="duitnow-qr-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={choosePaymentFile}
                    disabled={paymentBusy}
                    className="sr-only"
                  />
                </div>

                {paymentPreview && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-cream-200 bg-white p-2.5">
                    <img
                      src={paymentPreview}
                      alt="Selected DuitNow QR preview"
                      className="size-16 rounded-md object-contain"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-ink-700">
                        Preview of the selected image
                      </p>
                      <button
                        type="button"
                        onClick={replacePaymentQr}
                        disabled={paymentBusy}
                        className="mt-1 rounded-full bg-leaf-700 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-leaf-700/90 disabled:cursor-wait disabled:opacity-60"
                      >
                        {paymentBusy
                          ? 'Uploading…'
                          : 'Use this as the DuitNow QR'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {payment && !payment.duitnowQrIsDemo && (
              <div className="mt-3">
                {resetConfirm ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[11px] font-semibold text-amber-900">
                      Restore the demo QR?
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-amber-800">
                      Checkout will show the demo warning again. The uploaded
                      real QR image is removed.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={restoreDemoQr}
                        disabled={paymentBusy}
                        className="rounded-full bg-amber-900 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-amber-950 disabled:cursor-wait disabled:opacity-60"
                      >
                        {paymentBusy ? 'Restoring…' : 'Restore demo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetConfirm(false)}
                        disabled={paymentBusy}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
                      >
                        Keep real QR
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResetConfirm(true)}
                    className="text-[10px] font-semibold text-ink-400 underline underline-offset-2 transition hover:text-ink-600"
                  >
                    Restore demo QR
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
