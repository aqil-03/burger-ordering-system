export async function getMenu({ signal } = {}) {
  const response = await fetch('/api/menu', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `The menu request returned HTTP ${response.status}.`,
    )
  }

  if (!data || !Array.isArray(data.items)) {
    throw new Error('The menu response was not in the expected format.')
  }

  return data
}
