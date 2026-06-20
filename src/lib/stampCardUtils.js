import { supabase } from './supabase'

// Returns which card cycle a new visit belongs to.
// priorVisitCount = number of visits BEFORE the new one being inserted.
export function computeCycle(priorVisitCount, totalStamps) {
  return Math.floor(priorVisitCount / totalStamps) + 1
}

// Derives the full stamp state from all visits for a user+spot.
// visits: all rows ordered by visited_at ASC.
export function computeStampState(visits, totalStamps) {
  const totalVisits = visits.length

  if (totalVisits === 0) {
    return {
      totalVisits: 0,
      currentCycle: 1,
      stampsInCurrentCycle: 0,
      isCardFull: false,
      currentCycleVisits: [],
    }
  }

  const isCardFull = totalVisits % totalStamps === 0
  // When the card is exactly full, currentCycle is the completed cycle number.
  // The next scan will start cycle+1.
  const currentCycle = Math.floor((totalVisits - 1) / totalStamps) + 1
  const stampsInCurrentCycle = isCardFull ? totalStamps : totalVisits % totalStamps

  // Visits that belong to the current (or just-completed) cycle
  const cycleStart = (currentCycle - 1) * totalStamps
  const currentCycleVisits = visits.slice(cycleStart, cycleStart + totalStamps)

  return {
    totalVisits,
    currentCycle,
    stampsInCurrentCycle,
    isCardFull,
    currentCycleVisits,
  }
}

// Returns true if the user already has a stamp for this spot today (UTC).
export async function checkAlreadyStampedToday(userId, restaurantId) {
  const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  const from = `${today}T00:00:00.000Z`
  const to   = `${today}T23:59:59.999Z`

  const { data, error } = await supabase
    .from('stamp_card_visits')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .gte('visited_at', from)
    .lte('visited_at', to)
    .limit(1)

  if (error) throw error
  return data.length > 0
}
