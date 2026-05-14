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
      .select('full_name, university, student_id, major, year, membership_valid_until')
      .eq('user_id', user.id)
      .single()

    if (memberError || !memberData) {
      return { success: false, message: '멤버 정보를 찾을 수 없습니다.' }
    }

    // Get current date and time
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().split(' ')[0]

    // Call Google Apps Script webhook
    const response = await fetch(
      'https://script.google.com/macros/d/AKfycbycP_zrq9KS-8YSeJ0KuCWETGxScs7zuwixQWzmD6ZG34fSnZSfquea0sLhogp8EQ-J/usercallable',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logScan',
          storeId: storeId,
          date: date,
          time: time,
          fullName: memberData.full_name,
          university: memberData.university,
          studentId: memberData.student_id,
          major: memberData.major,
          year: memberData.year,
          membershipValidUntil: memberData.membership_valid_until,
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