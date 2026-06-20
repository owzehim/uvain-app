import { useState, useEffect } from 'react'
import { fetchConfigBySpot } from '../api/stampCardConfig'

export function useStampCardConfig(restaurantId) {
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
      .then((data) => { if (!cancelled) setConfig(data) })
      .catch(() => { if (!cancelled) setConfig(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [restaurantId])

  return { config, loading }
}
