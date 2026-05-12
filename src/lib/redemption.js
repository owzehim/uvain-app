import { supabase } from './supabase'

export async function logRedemption({ userId, storeId }) {
  // 1. Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, student_number, major, year_in_uni, membership_valid_until')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return { success: false, message: '프로필을 찾을 수 없습니다.' }
  }

  // 2. Check membership is valid
  const now = new Date()
  const validUntil = profile.membership_valid_until ? new Date(profile.membership_valid_until) : null
  if (!validUntil || validUntil < now) {
    return { success: false, message: '멤버십이 만료되었습니다.' }
  }

  // 3. Get store info
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    return { success: false, message: '매장을 찾을 수 없습니다.' }
  }

  // 4. Call Edge Function to log to Google Sheets
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-redemption`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId,
        storeId,
        storeName: store.name,
        fullName: profile.full_name,
        studentNumber: profile.student_number,
        major: profile.major,
        yearInUni: profile.year_in_uni,
        membershipValidUntil: profile.membership_valid_until,
      }),
    }
  )

  const result = await response.json()

  if (!result.success) {
    return { success: false, message: result.message || '기록에 실패했습니다.' }
  }

  return { success: true, storeName: store.name }
}
