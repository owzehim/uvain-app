import { supabase } from '../lib/supabase'
import { computeCycle, checkAlreadyStampedToday } from '../lib/stampCardUtils'

export async function fetchVisits(userId, restaurantId) {
  const { data, error } = await supabase
    .from('stamp_card_visits')
    .select('*')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .order('visited_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function insertVisit(userId, restaurantId, totalStamps) {
  const alreadyStamped = await checkAlreadyStampedToday(userId, restaurantId)
  if (alreadyStamped) return { alreadyStamped: true }

  const priorVisits = await fetchVisits(userId, restaurantId)
  const priorCount = priorVisits.length
  const cardCycle = computeCycle(priorCount, totalStamps)

  const { error: insertError } = await supabase
    .from('stamp_card_visits')
    .insert({
      user_id: userId,
      restaurant_id: restaurantId,
      visited_at: new Date().toISOString(),
      card_cycle: cardCycle,
      added_by_admin: false,
    })

  if (insertError) throw insertError

  const newCount = priorCount + 1
  const cycleCompleted = newCount % totalStamps === 0

  if (cycleCompleted) {
    const { error: rewardError } = await supabase
      .from('stamp_card_rewards')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        card_cycle: cardCycle,
        redeemed: false,
      })

    if (rewardError) throw rewardError
  }

  return { alreadyStamped: false, success: true, newCount, cardCycle, cycleCompleted }
}

export async function adminInsertVisit(userId, restaurantId, totalStamps, visitedAt, adminNote) {
  // admin도 supabase(anon 키)로 동작하도록 변경.
  // RLS에서 admin 유저만 이 쿼리를 허용하도록 정책을 설정해야 함.
  const { data: priorVisits, error: fetchError } = await supabase
    .from('stamp_card_visits')
    .select('*')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .order('visited_at', { ascending: true })

  if (fetchError) throw fetchError

  const priorCount = priorVisits?.length ?? 0
  const cardCycle = computeCycle(priorCount, totalStamps)

  const { error: insertError } = await supabase
    .from('stamp_card_visits')
    .insert({
      user_id: userId,
      restaurant_id: restaurantId,
      visited_at: visitedAt,
      card_cycle: cardCycle,
      added_by_admin: true,
      admin_note: adminNote ?? null,
    })

  if (insertError) throw insertError

  const newCount = priorCount + 1
  const cycleCompleted = newCount % totalStamps === 0

  if (cycleCompleted) {
    const { error: rewardError } = await supabase
      .from('stamp_card_rewards')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        card_cycle: cardCycle,
        redeemed: false,
      })

    if (rewardError) throw rewardError
  }

  return { success: true, newCount, cardCycle, cycleCompleted }
}