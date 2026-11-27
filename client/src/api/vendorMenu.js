import {
  VendorApiError,
  getVendorCsrfToken,
  vendorRequest,
} from './vendor'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export function getVendorMenu({ signal } = {}) {
  return vendorRequest('/api/vendor/menu', { signal })
}

export function createVendorMenuItem(payload) {
  return vendorRequest('/api/vendor/menu', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateVendorMenuItem(itemId, payload) {
  return vendorRequest(
    `/api/vendor/menu/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export function moveVendorMenuItem(itemId, direction) {
  return vendorRequest(
    `/api/vendor/menu/${encodeURIComponent(itemId)}/position`,
    {
      method: 'PATCH',
      body: JSON.stringify({ direction }),
    },
  )
}

export function deleteVendorMenuItem(itemId) {
  return vendorRequest(
    `/api/vendor/menu/${encodeURIComponent(itemId)}`,
    {
      method: 'DELETE',
    },
  )
}

export async function uploadVendorImage(file, kind) {
  if (!file) {
    throw new VendorApiError('Choose an image file to upload.', {
      code: 'IMAGE_REQUIRED',
    })
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new VendorApiError(
      'Upload a JPEG, PNG, or WebP image. SVG files are not accepted.',
      { code: 'UNSUPPORTED_IMAGE_TYPE' },
    )
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new VendorApiError('The image must be 5 MB or smaller.', {
      code: 'IMAGE_TOO_LARGE',
    })
  }

  let response

  try {
    response = await fetch(
      `/api/vendor/uploads/${encodeURIComponent(kind)}`,
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': file.type,
          'X-CSRF-Token': getVendorCsrfToken(),
        },
        body: file,
      },
    )
  } catch {
    throw new VendorApiError(
      'The image could not be uploaded. Check your connection and try again.',
      { code: 'NETWORK_ERROR' },
    )
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new VendorApiError(
      data?.error?.message || 'The image could not be uploaded.',
      {
        status: response.status,
        code: data?.error?.code || 'UPLOAD_ERROR',
      },
    )
  }

  return data
}

export function getMenuQrCode({ url, signal } = {}) {
  const query = url ? `?url=${encodeURIComponent(url)}` : ''
  return vendorRequest(`/api/vendor/qr/menu${query}`, { signal })
}

export function getVendorPaymentSettings({ signal } = {}) {
  return vendorRequest('/api/vendor/settings/payment', { signal })
}

export function updateVendorPaymentQr({
  duitnowQrUrl,
  duitnowQrIsDemo,
}) {
  return vendorRequest('/api/vendor/settings/payment', {
    method: 'PATCH',
    body: JSON.stringify({ duitnowQrUrl, duitnowQrIsDemo }),
  })
}
