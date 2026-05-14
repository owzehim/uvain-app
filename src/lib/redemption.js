import { supabase } from './supabase'

export async function logRedemption({ storeId }) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    // Get member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (memberError || !memberData) {
      return { success: false, message: '멤버 정보를 찾을 수 없습니다.' }
    }

    // Get current date and time
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().split(' ')[0]

    // Open Google Sheet directly with your service account
    const sheetData = {
      date,
      time,
      fullName: memberData.full_name || 'N/A',
      university: memberData.university || 'N/A',
      studentId: memberData.student_number || 'N/A',
      major: memberData.major || 'N/A',
      year: memberData.year || 'N/A',
      membershipValidUntil: memberData.membership_valid_until || 'N/A',
      storeId,
    }

    // Log to Google Sheets via your existing Apps Script
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbwejyk76fjur-mM34s1_mIJutd5CwtHTXgxNoRUSKa37il0xU4aPZp-gGyvfSDTRcRc/exec',
      {
        method: 'POST',
        body: new URLSearchParams(sheetData),
      }
    )

    const result = await response.text()
    
    if (result.includes('success')) {
      return { success: true, storeName: storeId }
    } else {
      return { success: false, message: 'Failed to log to sheet' }
    }
  } catch (err) {
    console.error('logRedemption error:', err)
    return { success: false, message: '오류가 발생했습니다: ' + err.message }
  }
}