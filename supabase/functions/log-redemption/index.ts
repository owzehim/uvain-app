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
        JSON.stringify({ success: false, message: 'Missing userId or storeId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ── Supabase admin client ─────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 1. 멤버 정보 (있으면 사용, 없어도 실패 안 함) ────────────────────
    const { data: member } = await supabase
      .from('members')
      .select(
        'full_name, university, student_number, major, year_in_uni, membership_valid_until'
      )
      .eq('user_id', userId)
      .maybeSingle()

    // ── 2. 제휴 매장 정보 (이건 반드시 있어야 함) ───────────────────────
    const { data: partnership, error: partnershipError } = await supabase
      .from('partnerships')
      .select('name, apps_script_url')
      .eq('id', storeId)
      .single()

    if (partnershipError || !partnership) {
      return new Response(
        JSON.stringify({ success: false, message: '유효하지 않은 제휴 매장입니다.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ── 3. 날짜/시간 (Amsterdam) ──────────────────────────────────────
    const now = new Date()
    const date = now.toLocaleDateString('ko-KR', { timeZone: 'Europe/Amsterdam' })
    const time = now.toLocaleTimeString('ko-KR', {
      timeZone: 'Europe/Amsterdam',
      hour: '2-digit',
      minute: '2-digit',
    })

    // 이니셜 (멤버 이름 있을 때만)
    const initials = member?.full_name
      ? member.full_name
          .split(' ')
          .map((w: string) => w[0]?.toUpperCase() ?? '')
          .join('.')
      : ''

    // ── 4. 마스터 시트용 payload (내부용, 값 없으면 빈 값) ────────────────
    const masterPayload = {
      type: 'master',
      date,
      time,
      full_name: member?.full_name ?? '',
      university: member?.university ?? '',
      student_id: member?.student_number ?? '',
      major: member?.major ?? '',
      year: member?.year_in_uni ?? '',
      membership_valid_until: member?.membership_valid_until ?? '',
      place_name: partnership.name,
      store_id: storeId,
    }

    // ── 5. 매장 시트용 payload (제휴 매장용, 안전한 정보만) ───────────────
    const storePayload = {
      type: 'store',
      date,
      time,
      initials,
      university: member?.university ?? '',
      student_id: member?.student_number ?? '',
      membership_valid_until: member?.membership_valid_until ?? '',
    }

    // ── 6. 구글 Apps Script 두 개 동시에 호출 ───────────────────────────
    const masterUrl = Deno.env.get('MASTER_SHEET_APPS_SCRIPT_URL')!
    const storeUrl = partnership.apps_script_url

    const [masterRes, storeRes] = await Promise.all([
      fetch(masterUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterPayload),
      }),
      fetch(storeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storePayload),
      }),
    ])

    if (!masterRes.ok || !storeRes.ok) {
      console.error(
        'Sheet POST failed:',
        masterRes.ok ? 'OK' : await masterRes.text(),
        storeRes.ok ? 'OK' : await storeRes.text()
      )
      // 하지만 유저한테는 실패로 돌려보내지 않음
    }

    // ── 7. Supabase redemptions 백업 로그 ───────────────────────────────
    await supabase.from('redemptions').insert({
      user_id: userId,
      store_id: storeId,
      redeemed_at: now.toISOString(),
    })

    // 항상 성공으로 응답 (매장만 유효하면)
    return new Response(
      JSON.stringify({ success: true, storeName: partnership.name }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('log-redemption fatal error:', err)
    return new Response(
      JSON.stringify({ success: false, message: '서버 오류가 발생했습니다.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})