import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, storeId } = await req.json()

    if (!userId || !storeId) {
      return new Response(
        JSON.stringify({ success: false, message: 'userId 또는 storeId가 없습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Fetch member profile — matches your actual 'members' table columns
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('full_name, major, student_number, membership_valid_until, is_member')
      .eq('user_id', userId)
      .single()

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ success: false, message: '멤버 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Check membership is active and not expired
    const isValid =
      member.is_member &&
      member.membership_valid_until &&
      new Date(member.membership_valid_until) >= new Date()

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, message: '멤버십이 유효하지 않습니다. 임원에게 문의하세요.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Fetch store name from 'restaurants' table (your existing table)
    const { data: store, error: storeError } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ success: false, message: '매장 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Build row data
    const now = new Date()
    const date = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
    const time = now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })

    // Estimate year in uni from student number (first 4 digits = enrollment year)
    const enrollYear = member.student_number ? parseInt(String(member.student_number).slice(0, 4)) : null
    const currentYear = new Date().getFullYear()
    const yearInUni = enrollYear ? `${currentYear - enrollYear + 1}학년` : '알 수 없음'

    // 5. POST to Apps Script web app
    const appsScriptUrl = Deno.env.get('APPS_SCRIPT_URL')!
    const secret = Deno.env.get('APPS_SCRIPT_SECRET')!

    const sheetRes = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        date,
        time,
        fullName: member.full_name ?? '알 수 없음',
        studentNumber: member.student_number ?? '알 수 없음',
        major: member.major ?? '알 수 없음',
        yearInUni,
        membershipValidUntil: member.membership_valid_until ?? '알 수 없음',
        storeName: store.name,
        userId,
      }),
    })

    if (!sheetRes.ok) {
      const errText = await sheetRes.text()
      console.error('Apps Script error:', errText)
      return new Response(
        JSON.stringify({ success: false, message: 'Google Sheets 기록에 실패했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, storeName: store.name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('log-redemption error:', err)
    return new Response(
      JSON.stringify({ success: false, message: '서버 내부 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})