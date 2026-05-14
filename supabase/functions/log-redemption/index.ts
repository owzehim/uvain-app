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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Supabase admin client ──────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 1. Fetch member data from the members table ────────────────────────
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('full_name, university, student_number, major, year_in_uni, membership_valid_until')
      .eq('user_id', userId)
      .single()

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ success: false, message: '멤버 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Check membership is still valid ────────────────────────────────
    const validUntil = new Date(member.membership_valid_until)
    if (validUntil < new Date()) {
      return new Response(
        JSON.stringify({ success: false, message: '멤버십이 만료되었습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Fetch partnership info ──────────────────────────────────────────
    const { data: partnership, error: partnershipError } = await supabase
      .from('partnerships')
      .select('name, apps_script_url')
      .eq('id', storeId)
      .single()

    if (partnershipError || !partnership) {
      return new Response(
        JSON.stringify({ success: false, message: '유효하지 않은 제휴 매장입니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Build date/time strings (Amsterdam timezone) ───────────────────
    const now = new Date()
    const date = now.toLocaleDateString('ko-KR', { timeZone: 'Europe/Amsterdam' })
    const time = now.toLocaleTimeString('ko-KR', {
      timeZone: 'Europe/Amsterdam',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Initials: first letter of each word in full_name, joined with dots
    // e.g. "Kim Min Ji" → "K.M.J"
    const initials = member.full_name
      .split(' ')
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('.')

    // ── 5. Build payloads for the two Google Sheets ───────────────────────

    // Master sheet payload — full data, UVA-IN internal only
    const masterPayload = {
      type: 'master',
      date,
      time,
      full_name: member.full_name,
      university: member.university,
      student_id: member.student_number,
      major: member.major,
      year: member.year_in_uni,
      membership_valid_until: member.membership_valid_until,
      place_name: partnership.name,
      store_id: storeId,
    }

    // Store sheet payload — limited data, safe to share with partnership owner
    const storePayload = {
      type: 'store',
      date,
      time,
      initials,
      university: member.university,
      student_id: member.student_number,
      membership_valid_until: member.membership_valid_until,
    }

    // ── 6. POST to both Google Apps Script Web Apps simultaneously ────────
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
      // Log the error but do not fail the user — sheet logging is non-blocking
      console.error('Sheet POST failed:', await masterRes.text(), await storeRes.text())
    }

    // ── 7. Log to Supabase redemptions table as internal backup ───────────
    await supabase.from('redemptions').insert({
      user_id: userId,
      store_id: storeId,
      redeemed_at: now.toISOString(),
    })

    return new Response(
      JSON.stringify({ success: true, storeName: partnership.name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ success: false, message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
