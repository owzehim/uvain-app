import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
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
  const channelIdRef = useRef(
    Math.random().toString(36).slice(2) + Date.now().toString(36),
  )
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
    } catch (e) {
      console.warn('fetchVisits error:', e)
      setVisits([])
      setStampState(EMPTY_STATE)
    } finally {
      setLoading(false)
    }
  }, [userId, restaurantId, totalStamps])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!userId || !restaurantId || !totalStamps) return undefined

    const channel = supabase
      .channel(`stamp-card-visits:${restaurantId}:${userId}:${channelIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stamp_card_visits',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new?.user_id ? payload.new : payload.old
          if (row?.user_id === userId) load()
        },
      )
      .subscribe()

    const handleFocus = () => load()
    window.addEventListener('focus', handleFocus)
    const intervalId = window.setInterval(load, 10000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [load, restaurantId, totalStamps, userId])

  return { visits, stampState, loading, refetch: load }
}
