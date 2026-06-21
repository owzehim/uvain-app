import { supabase } from '../../../lib/supabase'

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
  const { data, error } = await supabase.functions.invoke('admin-add-stamp', {
    body: {
      action: 'listMembers',
      restaurantId,
      totalStamps,
    },
  })

  if (error) throw new Error(data?.message || error.message || '스탬프 정보를 불러오지 못했습니다.')
  if (!data?.success) throw new Error(data?.message || '스탬프 정보를 불러오지 못했습니다.')

  return data.rows ?? []
}
