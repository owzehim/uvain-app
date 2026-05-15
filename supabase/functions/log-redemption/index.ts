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
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { storeId } = await req.json().catch(() => ({}))

    if (!token || !storeId) {
      return new Response(
        JSON.stringify({ success: false, message: '잘못된 요청입니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    // Use service role key - try both old and new secret names
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      || (() => {
        try {
          const raw = Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'
          const parsed = JSON.parse(raw)
          return parsed.service_role_key || parsed.service_role || Object.values(parsed)[0] || ''
        } catch { return '' }
      })()

    if (!serviceKey) {
      console.error('No service key found')
      return new Response(
        JSON.stringify({ success: false, message: '서버 설정 오류입니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Use service role client to verify the JWT token
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // Verify user via their JWT token using admin client
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData?.user

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ success: false, message: '로그인이 필요합니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log('User verified:', user.id)

    // 멤버 정보
    const { data: member, error: memberError } = await admin
      .from('members')
      .select('full_name, university, student_number, major, year_in_uni, membership_valid_until, is_member')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      console.error('Member error:', memberError)
      return new Response(
        JSON.stringify({ success: false, message: '멤버 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 멤버십 상태 체크
    const now = new Date()
    const validUntil = member.membership_valid_until ? new Date(member.membership_valid_until) : null

    if (!member.is_member) {
      return new Response(
        JSON.stringify({ success: false, message: '멤버십이 활성화되어 있지 않습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!validUntil || validUntil < now) {
      return new Response(
        JSON.stringify({ success: false, message: '멤버십이 만료되었습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 제휴 매장 정보
    const { data: partnership, error: partnershipError } = await admin
      .from('partnerships')
      .select('name, apps_script_url')
      .eq('id', storeId)
      .single()

    if (partnershipError || !partnership) {
      console.error('Partnership error:', partnershipError)
      return new Response(
        JSON.stringify({ success: false, message: '유효하지 않은 제휴 매장입니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 시간 정보 (Amsterdam)
    const date = now.toLocaleDateString('ko-KR', { timeZone: 'Europe/Amsterdam' })
    const time = now.toLocaleTimeString('ko-KR', {
      timeZone: 'Europe/Amsterdam',
      hour: '2-digit',
      minute: '2-digit',
    })

    const initials = (member.full_name || '')
      .split(' ')
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('.')

    const masterSheetUrl = Deno.env.get('MASTER_SHEET_APPS_SCRIPT_URL')!

    // 마스터 시트용 payload
    const masterPayload = {
      type: 'master',
      date,
      time,
      full_name: member.full_name || '',
      university: member.university || '',
      student_id: member.student_number || '',
      major: member.major || '',
      year: member.year_in_uni || '',
      membership_valid_until: member.membership_valid_until || '',
      place_name: partnership.name,
      store_id: storeId,
    }

    // 매장 시트용 payload
    const storePayload = {
      type: 'store',
      date,
      time,
      initials,
      university: member.university || '',
      student_id: member.student_number || '',
      membership_valid_until: member.membership_valid_until || '',
    }

    const [masterRes, storeRes] = await Promise.all([
      fetch(masterSheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterPayload),
      }),
      fetch(partnership.apps_script_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storePayload),
      }),
    ])

    if (!masterRes.ok || !storeRes.ok) {
      console.error('Sheet POST failed:', await masterRes.text(), await storeRes.text())
    }

    // redemptions 테이블 로그
    await admin.from('redemptions').insert({
      user_id: user.id,
      store_id: storeId,
      redeemed_at: now.toISOString(),
    })

    return new Response(
      JSON.stringify({ success: true, storeName: partnership.name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('log-redemption fatal error:', err)
    return new Response(
      JSON.stringify({ success: false, message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
