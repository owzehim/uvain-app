import { useState, useEffect, useCallback } from 'react'
import { fetchVisits } from '../api/visits'
import { computeStampState } from '../utils'

const EMPTY_STATE = {
  totalVisits: 0,
  currentCycle: 1,
  stampsInCurrentCycle: 0,
  isCardFull: false,
  currentCycleVisits: [],
}

export function useUserStampVisits({ userId, restaurantId, totalStamps }) {
  const [visits, setVisits] = useState([])
  const [stampState, setStampState] = useState(EMPTY_STATE)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!userId || !restaurantId || !totalStamps) {
      setVisits([])
      setStampState(EMPTY_STATE)
      return
    }

    setLoading(true)
    try {
      const data = await fetchVisits(userId, restaurantId)
      setVisits(data)
      setStampState(computeStampState(data, totalStamps))
    } catch {
      setVisits([])
      setStampState(EMPTY_STATE)
    } finally {
      setLoading(false)
    }
  }, [userId, restaurantId, totalStamps])

  useEffect(() => { load() }, [load])

  return { visits, stampState, loading, refetch: load }
}
