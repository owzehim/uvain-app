import { supabase } from '../../../lib/supabase'
import { computeStampState } from '../utils'

export async function fetchPendingReward(userId, restaurantId) {
  const { data, error } = await supabase
    .from('stamp_card_rewards')
    .select('*')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('redeemed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }
  return data
}

export async function redeemReward(rewardId) {
  const { error } = await supabase
    .from('stamp_card_rewards')
    .update({
      redeemed: true,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', rewardId)

  if (error) throw error
}

export async function restoreReward(rewardId) {
  const { error } = await supabase
    .from('stamp_card_rewards')
    .update({
      redeemed: false,
      redeemed_at: null,
    })
    .eq('id', rewardId)

  if (error) throw error
}

// Admin use only — fetches all members with their stamp state for a given spot
export async function fetchAllMemberStampData(restaurantId, totalStamps) {
  // 여기서도 supabase(anon key) 사용.
  // Supabase RLS에서 admin 유저만 이 쿼리를 허용하도록 정책이 필요함.
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, user_id, first_name, last_name')

  if (membersError) throw membersError
  if (!members?.length) return []

  const results = await Promise.all(
    members.map(async (member) => {
      const { data: visits } = await supabase
        .from('stamp_card_visits')
        .select('*')
        .eq('user_id', member.user_id)
        .eq('restaurant_id', restaurantId)
        .order('visited_at', { ascending: true })

      const { data: latestRewardRows } = await supabase
        .from('stamp_card_rewards')
        .select('*')
        .eq('user_id', member.user_id)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(1)

      const stampState = computeStampState(visits ?? [], totalStamps)
      const latestReward = latestRewardRows?.[0] ?? null

      return { member, stampState, latestReward }
    })
  )

  return results
}
