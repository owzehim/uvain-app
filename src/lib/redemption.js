import { supabase } from './supabase'

export async function logRedemption({ userId, storeId }) {
  // 1) 세션(JWT) 가져오기
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const session = sessionData?.session

  if (sessionError || !session) {
    return { success: false, message: '로그인이 필요합니다.' }
  }

  // 2) Edge Function 호출 (모든 검증 + 로깅 거기서 처리)
  let response
  try {
    response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-redemption`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, storeId }),
      }
    )
  } catch (err) {
    console.error('log-redemption network error:', err)
    return {
      success: false,
      message: '서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  let result
  try {
    result = await response.json()
  } catch (err) {
    console.error('log-redemption JSON parse error:', err)
    return {
      success: false,
      message: '서버 응답을 해석할 수 없습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  if (!response.ok || !result?.success) {
    return {
      success: false,
      message: result?.message || '할인을 적용할 수 없습니다. 다시 시도해주세요.',
    }
  }

  return {
    success: true,
    storeName: result.storeName || '매장',
  }
}