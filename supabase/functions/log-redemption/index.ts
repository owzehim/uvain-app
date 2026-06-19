import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIVE_MINUTES_MS = 5 * 60 * 1000

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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || (() => {
      try {
        const raw = Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'
        const parsed = JSON.parse(raw)
        return parsed.service_role_key || parsed.service_role || Object.values(parsed)[0] || ''
      } catch {
        return ''
      }
    })()

    if (!serviceKey) {
      console.error('No service key found')
      return new Response(
        JSON.stringify({ success: false, message: '서버 설정 오류입니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData?.user

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ success: false, message: '로그인이 필요합니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Fetch member profile ───────────────────────────────────────────────
    const { data: member, error: memberError } = await admin
      .from('members')
      .select(
        'first_name, last_name, University, student_number, major, education_level, year_number, year_of_birth, country_of_origin, gender, membership_valid_until, is_member',
      )
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      console.error('Member error:', memberError)
      return new Response(
        JSON.stringify({ success: false, message: '멤버 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Membership validity check ──────────────────────────────────────────
    const now = new Date()
    const validUntil = member.membership_valid_until
      ? new Date(member.membership_valid_until)
      : null

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

    // ── Fetch partnership ──────────────────────────────────────────────────
    const { data: partnership, error: partnershipError } = await admin
      .from('partnerships')
      .select('name, sheet_name, master_apps_script_url, partner_apps_script_url')
      .eq('id', storeId)
      .single()

    if (partnershipError || !partnership) {
      console.error('Partnership error:', partnershipError)
      return new Response(
        JSON.stringify({ success: false, message: '유효하지 않은 제휴 매장입니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Date / time (Amsterdam) ────────────────────────────────────────────
    const date = now.toLocaleDateString('en-GB', { timeZone: 'Europe/Amsterdam' })
    const time = now.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/Amsterdam',
      hour: '2-digit',
      minute: '2-digit',
    })

    // ── Safe field helpers ─────────────────────────────────────────────────
    const safe = (v: unknown) => (v != null && v !== '' ? String(v) : '')

    // ── Check for recent redemption (5 minutes window) ─────────────────────
    const { data: recentRedemption, error: recentError } = await admin
      .from('redemptions')
      .select('id, redeemed_at')
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .order('redeemed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentError) {
      console.error('Recent redemption fetch error:', recentError)
    }

    let reuseRecent = false
    if (recentRedemption?.redeemed_at) {
      const last = new Date(recentRedemption.redeemed_at)
      const diffMs = now.getTime() - last.getTime()
      if (diffMs >= 0 && diffMs < FIVE_MINUTES_MS) {
        // Within 5 minutes: treat as already logged, do NOT create a new record
        reuseRecent = true
      }
    }

    if (reuseRecent) {
      // No new DB row, no Google Sheets POST — just return success
      return new Response(
        JSON.stringify({ success: true, storeName: partnership.name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Log to redemptions table first so we have the ID ──────────────────
    const { data: redemptionRow, error: redemptionError } = await admin
      .from('redemptions')
      .insert({
        user_id: user.id,
        store_id: storeId,
        redeemed_at: now.toISOString(),
      })
      .select('id')
      .single()

    if (redemptionError) {
      console.error('Redemption insert error:', redemptionError)
      // Non-fatal for the user — continue
    }

    const redemptionId = redemptionRow?.id ?? ''

    // ── Master sheet payload ───────────────────────────────────────────────
    const masterPayload = {
      type: 'master',
      date,
      time,
      first_name: safe(member.first_name),
      last_name: safe(member.last_name),
      university: safe(member.University),
      student_id: safe(member.student_number),
      major: safe(member.major),
      education_level: safe(member.education_level),
      year_number: member.year_number ?? '',
      year_of_birth: safe(member.year_of_birth),
      country_of_origin: safe(member.country_of_origin),
      gender: safe(member.gender),
      membership_valid_until: safe(member.membership_valid_until),
      place_name: partnership.name,
      redemption_id: redemptionId,
    }

    // ── Partner sheet payload ──────────────────────────────────────────────
    const storePayload = {
      type: 'store',
      sheet_name: partnership.sheet_name || partnership.name,
      date,
      time,
      first_name: safe(member.first_name),
      last_name: safe(member.last_name),
      university: safe(member.University),
      major: safe(member.major),
      education_level: safe(member.education_level),
      year_number: member.year_number ?? '',
      year_of_birth: safe(member.year_of_birth),
      country_of_origin: safe(member.country_of_origin),
      gender: safe(member.gender),
      membership_valid_until: safe(member.membership_valid_until),
      redemption_id: redemptionId,
    }

    const [masterRes, storeRes] = await Promise.all([
      fetch(partnership.master_apps_script_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterPayload),
      }),
      fetch(partnership.partner_apps_script_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storePayload),
      }),
    ])

    if (!masterRes.ok || !storeRes.ok) {
      const masterText = await masterRes.text()
      const storeText = await storeRes.text()
      console.error('Sheet POST failed — master:', masterText, '| store:', storeText)
    }

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