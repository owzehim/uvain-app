import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { computeStampState } from '../lib/stampCardUtils'

export async function fetchPendingReward(userId, restaurantId) {
  const { data, error } = await supabase
    .from('stamp_card_rewards')
    .select('*')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('redeemed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function redeemReward(rewardId) {
  const { error } = await supabase
    .from('stamp_card_rewards')
    .update({ redeemed: true, redeemed_at: new Date().toISOString() })
    .eq('id', rewardId)

  if (error) throw error
}

export async function restoreReward(rewardId) {
  const { error } = await supabaseAdmin
    .from('stamp_card_rewards')
    .update({ redeemed: false, redeemed_at: null })
    .eq('id', rewardId)

  if (error) throw error
}

// Admin use only — fetches all members with their stamp state for a given spot
export async function fetchAllMemberStampData(restaurantId, totalStamps) {
  const { data: members, error: membersError } = await supabaseAdmin
    .from('members')
    .select('id, user_id, first_name, last_name')

  if (membersError) throw membersError
  if (!members?.length) return []

  const results = await Promise.all(
    members.map(async (member) => {
      const { data: visits } = await supabaseAdmin
        .from('stamp_card_visits')
        .select('*')
        .eq('user_id', member.user_id)
        .eq('restaurant_id', restaurantId)
        .order('visited_at', { ascending: true })

      const { data: latestRewardRows } = await supabaseAdmin
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
