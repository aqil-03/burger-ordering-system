export class VendorApiError extends Error {
  constructor(message, { status = 0, code = '' } = {}) {
    super(message)
    this.name = 'VendorApiError'
    this.status = status
    this.code = code
  }
}

const VENDOR_CSRF_COOKIE = 'bh_vendor_csrf'
const VENDOR_CSRF_HEADER = 'X-CSRF-Token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

async function readJson(response) {
  return response.json().catch(() => null)
}

function readCookie(name) {
  const prefix = `${name}=`
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix))

  if (!cookie) return ''

  const value = cookie.slice(prefix.length)

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function getVendorCsrfToken() {
  return readCookie(VENDOR_CSRF_COOKIE)
}

export async function vendorRequest(path, options = {}) {
  let response
  const method = String(options.method ?? 'GET').toUpperCase()
  const csrfToken = SAFE_METHODS.has(method)
    ? ''
    : getVendorCsrfToken()

  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { [VENDOR_CSRF_HEADER]: csrfToken } : {}),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new VendorApiError(
      'The vendor server could not be reached. Check your connection and try again.',
      { code: 'NETWORK_ERROR' },
    )
  }

  const data = response.status === 204 ? null : await readJson(response)

  if (!response.ok) {
    throw new VendorApiError(
      data?.error?.message || 'The vendor request failed.',
      {
        status: response.status,
        code: data?.error?.code || 'VENDOR_ERROR',
      },
    )
  }

  return data
}

export function vendorLogin({ identifier, password }) {
  return vendorRequest('/api/vendor/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export async function vendorMe({ signal } = {}) {
  const data = await vendorRequest('/api/vendor/auth/me', { signal })
  return data?.vendor ?? null
}

export function vendorLogout() {
  return vendorRequest('/api/vendor/auth/logout', { method: 'POST' })
}

export function getVendorDashboard({ signal } = {}) {
  return vendorRequest('/api/vendor/dashboard', { signal })
}

export function updateVendorOrderStatus(orderId, action, note = '') {
  return vendorRequest(
    `/api/vendor/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ action, note }),
    },
  )
}

export function updateVendorPaymentStatus(orderId, status, note = '') {
  return vendorRequest(
    `/api/vendor/orders/${encodeURIComponent(orderId)}/payment`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    },
  )
}
