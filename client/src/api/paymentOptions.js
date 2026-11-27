export async function getPaymentOptions({ signal } = {}) {
  const response = await fetch('/api/checkout/payment-options', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `The payment options request returned HTTP ${response.status}.`,
    )
  }

  if (!data || !data.methods) {
    throw new Error(
      'The payment options response was not in the expected format.',
    )
  }

  return data
}
