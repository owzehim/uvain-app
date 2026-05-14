import { supabase } from './supabase'

export async function logRedemption({ storeId }) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    // Get member data from Supabase
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (memberError) {
      console.error('Member fetch error:', memberError)
      return { success: false, message: `DB Error: ${memberError.message}` }
    }

    if (!memberData) {
      return { success: false, message: '멤버 정보를 찾을 수 없습니다.' }
    }

    // Get current date and time
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().split(' ')[0]

    // Call Google Apps Script webhook
    const response = await fetch(
      'https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallable',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logScan',
          storeId: storeId,
          date: date,
          time: time,
          fullName: memberData.full_name || 'N/A',
          university: memberData.university || 'N/A',
          studentId: memberData.student_number || 'N/A',
          major: memberData.major || 'N/A',
          year: memberData.year || 'N/A',
          membershipValidUntil: memberData.membership_valid_until || 'N/A',
        }),
      }
    )

    const result = await response.json()

    if (!result.success) {
      return { success: false, message: result.message || '할인을 적용할 수 없습니다.' }
    }

    return { success: true, storeName: result.storeName || storeId }
  } catch (err) {
    console.error('logRedemption error:', err)
    return { success: false, message: '오류가 발생했습니다: ' + err.message }
  }
}