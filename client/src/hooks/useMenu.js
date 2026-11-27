import { useCallback, useEffect, useState } from 'react'
import { getMenu } from '../api/menu'

const fallbackRestaurant = {
  name: 'Burger House',
  logoUrl: null,
}

export function useMenu() {
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getMenu({ signal: controller.signal })
      .then((data) => setMenu(data))
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return
        setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [attempt])

  const reload = useCallback(() => {
    setMenu(null)
    setError('')
    setLoading(true)
    setAttempt((currentAttempt) => currentAttempt + 1)
  }, [])

  return {
    menu,
    restaurant: menu?.restaurant ?? fallbackRestaurant,
    items: menu?.items ?? [],
    loading,
    error,
    reload,
  }
}
