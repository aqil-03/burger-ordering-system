export class OrderApiError extends Error {
  constructor(message, { status = 0, code = '' } = {}) {
    super(message)
    this.name = 'OrderApiError'
    this.status = status
    this.code = code
  }
}

async function readJson(response) {
  return response.json().catch(() => null)
}

export async function createOrder(payload) {
  let response

  try {
    response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new OrderApiError(
      'The order could not reach the server. Check your connection and try again.',
      { code: 'NETWORK_ERROR' },
    )
  }

  const data = await readJson(response)

  if (!response.ok) {
    throw new OrderApiError(
      data?.error?.message || 'The order could not be created.',
      {
        status: response.status,
        code: data?.error?.code || 'ORDER_ERROR',
      },
    )
  }

  if (!data?.order?.trackingToken) {
    throw new OrderApiError(
      'The server response did not contain an order reference.',
      { code: 'INVALID_RESPONSE' },
    )
  }

  return data
}

export async function getOrderByTrackingToken(token, { signal } = {}) {
  let response

  try {
    response = await fetch(`/api/orders/${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new OrderApiError(
      'The order could not be loaded. Check your connection and try again.',
      { code: 'NETWORK_ERROR' },
    )
  }

  const data = await readJson(response)

  if (!response.ok) {
    throw new OrderApiError(
      data?.error?.message || 'The order could not be loaded.',
      {
        status: response.status,
        code: data?.error?.code || 'ORDER_ERROR',
      },
    )
  }

  if (!data?.order) {
    throw new OrderApiError(
      'The order response was not in the expected format.',
      { code: 'INVALID_RESPONSE' },
    )
  }

  return data
}
