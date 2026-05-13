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

    // ── Supabase admin client ──────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 1. Fetch member profile ────────────────────────────────────────────────
    // Assumes a `profiles` table with these columns (adjust names as needed):
    //   id, full_name, university, student_id, major, year, membership_valid_until
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, university, student_id, major, year, membership_valid_until')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, message: '멤버 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Check membership validity ──────────────────────────────────────────
    const validUntil = new Date(profile.membership_valid_until)
    if (validUntil < new Date()) {
      return new Response(
        JSON.stringify({ success: false, message: '멤버십이 만료되었습니다.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Fetch store info ────────────────────────────────────────────────────
    // Assumes a `stores` table with: id, name, apps_script_url
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('name, apps_script_url')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ success: false, message: '유효하지 않은 매장입니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Build payload ───────────────────────────────────────────────────────
    const now = new Date()
    const date = now.toLocaleDateString('ko-KR', { timeZone: 'Europe/Amsterdam' })
    const time = now.toLocaleTimeString('ko-KR', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' })

    // Initials: first letter of each word in full_name
    const initials = profile.full_name
      .split(' ')
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('.')

    const masterPayload = {
      type: 'master',
      date,
      time,
      full_name: profile.full_name,
      university: profile.university,
      student_id: profile.student_id,
      major: profile.major,
      year: profile.year,
      membership_valid_until: profile.membership_valid_until,
      place_name: store.name,
      store_id: storeId,
    }

    const storePayload = {
      type: 'store',
      date,
      time,
      initials,
      university: profile.university,
      student_id: profile.student_id,
      membership_valid_until: profile.membership_valid_until,
    }

    // ── 5. POST to both Google Apps Script Web Apps in parallel ───────────────
    const masterUrl = Deno.env.get('MASTER_SHEET_APPS_SCRIPT_URL')!
    const storeUrl = store.apps_script_url  // per-store URL from DB

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
      console.error('Sheet POST failed:', await masterRes.text(), await storeRes.text())
      // Still return success to user — sheet logging is non-blocking
    }

    // ── 6. (Optional) log to Supabase redemptions table ───────────────────────
    await supabase.from('redemptions').insert({
      user_id: userId,
      store_id: storeId,
      redeemed_at: now.toISOString(),
    })

    return new Response(
      JSON.stringify({ success: true, storeName: store.name }),
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