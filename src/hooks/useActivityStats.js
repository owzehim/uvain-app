import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useActivityStats(userId) {
  const [stats, setStats] = useState({
    discountCount: 0,
    reviewCount: 0,
    streakDays: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchStats = async () => {
      setLoading(true)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { data: redemptions } = await supabase
        .from('redemptions')
        .select('id, redeemed_at')
        .eq('user_id', userId)
        .gte('redeemed_at', monthStart)

      const discountCount = redemptions?.length ?? 0

      const { data: reviews } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', userId)

      const reviewCount = reviews?.length ?? 0

      const { data: allRedemptions } = await supabase
        .from('redemptions')
        .select('redeemed_at')
        .eq('user_id', userId)
        .order('redeemed_at', { ascending: false })

      const streakDays = calcStreak(allRedemptions ?? [])

      setStats({ discountCount, reviewCount, streakDays })
      setLoading(false)
    }

    fetchStats()
  }, [userId])

  return { stats, loading }
}

function calcStreak(redemptions) {
  if (!redemptions.length) return 0

  const visitDays = new Set(
    redemptions.map((r) => r.redeemed_at.slice(0, 10))
  )

  const today = new Date()
  const todayStr = toDateStr(today)
  const yesterdayStr = toDateStr(new Date(today - 86400000))

  if (!visitDays.has(todayStr) && !visitDays.has(yesterdayStr)) return 0

  let streak = 0
  let cursor = new Date(today)

  while (visitDays.has(toDateStr(cursor))) {
    streak++
    cursor = new Date(cursor - 86400000)
  }

  return streak
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}