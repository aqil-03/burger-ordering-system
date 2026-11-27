import { useCallback, useEffect, useState } from 'react'
import { getPaymentOptions } from '../api/paymentOptions'

export function usePaymentOptions() {
  const [options, setOptions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getPaymentOptions({ signal: controller.signal })
      .then((data) => setOptions(data))
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
    setOptions(null)
    setError('')
    setLoading(true)
    setAttempt((currentAttempt) => currentAttempt + 1)
  }, [])

  return { options, loading, error, reload }
}
