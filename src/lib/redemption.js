import { supabase } from './supabase'

export async function logRedemption({ storeId }) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (memberError || !memberData) {
      return { success: false, message: '멤버 정보를 찾을 수 없습니다.' }
    }

    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().split(' ')[0]

    const { error: insertError } = await supabase
      .from('scan_logs')
      .insert({
        user_id: user.id,
        store_id: storeId,
        date: date,
        time: time,
        full_name: memberData.full_name || 'N/A',
        university: memberData.university || 'N/A',
        student_id: memberData.student_number || 'N/A',
        major: memberData.major || 'N/A',
        year: memberData.year || 'N/A',
        membership_valid_until: memberData.membership_valid_until || 'N/A',
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return { success: false, message: 'Failed to log scan' }
    }

    return { success: true, storeName: storeId }
  } catch (err) {
    console.error('logRedemption error:', err)
    return { success: false, message: '오류가 발생했습니다: ' + err.message }
  }
}