import { useState, useEffect } from 'react'
import { DEFAULT_STAMP_CARD_CONFIG, fetchConfigBySpot } from '../api/stampCardConfig'

export function useStampCardConfig(restaurantId, { useDefault = false } = {}) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!restaurantId) {
      setConfig(null)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchConfigBySpot(restaurantId)
      .then((data) => {
        if (!cancelled) setConfig(data ?? (useDefault ? DEFAULT_STAMP_CARD_CONFIG : null))
      })
      .catch(() => {
        if (!cancelled) setConfig(useDefault ? DEFAULT_STAMP_CARD_CONFIG : null)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [restaurantId, useDefault])

  return { config, loading }
}
