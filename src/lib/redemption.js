import { supabase } from './supabase'

export async function logRedemption({ userId, storeId }) {
  // ── 1. Get member data ─────────────────────────────────────────────────
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (memberError || !member) {
    console.error('Member fetch error:', memberError)
    return { success: false, message: '멤버 정보를 찾을 수 없습니다.' }
  }

  // ── 2. Check membership is active and not expired ─────────────────────
  if (!member.is_member) {
    return { success: false, message: '멤버십이 활성화되어 있지 않습니다.' }
  }

  const now = new Date()
  const validUntil = member.membership_valid_until
    ? new Date(member.membership_valid_until)
    : null

  if (!validUntil || validUntil < now) {
    return { success: false, message: '멤버십이 만료되었습니다.' }
  }

  // ── 3. Get partnership info ────────────────────────────────────────────
  const { data: partnership, error: partnershipError } = await supabase
    .from('partnerships')
    .select('name')
    .eq('id', storeId)
    .single()

  if (partnershipError || !partnership) {
    console.error('Partnership fetch error:', partnershipError)
    return { success: false, message: '유효하지 않은 제휴 매장입니다.' }
  }

  // ── 4. Call the Edge Function ──────────────────────────────────────────
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData?.session

  if (!session) {
    return { success: false, message: '로그인이 필요합니다.' }
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-redemption`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, storeId }),
    }
  )

  const result = await response.json()

  if (!result.success) {
    return { success: false, message: result.message || '기록에 실패했습니다.' }
  }

  return { success: true, storeName: partnership.name }
}