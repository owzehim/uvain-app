import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────
// sync-review-to-sheets
// Called by reviewApi.js after a review is saved to Supabase.
// Looks up the partnership to get both Apps Script URLs,
// then POSTs a 'review' type request to both master and
// partner sheets to update the existing scan row in-place.
// ─────────────────────────────────────────────────────────────

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

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: '로그인이 필요합니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { redemption_id, store_id, rating, tags_string, comment } = await req.json()

    if (!redemption_id || !store_id) {
      return new Response(
        JSON.stringify({ success: false, message: '잘못된 요청입니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || (() => {
      try {
        const raw    = Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'
        const parsed = JSON.parse(raw)
        return parsed.service_role_key || parsed.service_role || Object.values(parsed)[0] || ''
      } catch {
        return ''
      }
    })()

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // ── Verify the token is valid ──────────────────────────────────────────
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, message: '인증 오류입니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Fetch partnership to get both Apps Script URLs ─────────────────────
    const { data: partnership, error: partnershipError } = await admin
      .from('partnerships')
      .select('name, sheet_name, master_apps_script_url, partner_apps_script_url')
      .eq('id', store_id)
      .single()

    if (partnershipError || !partnership) {
      console.error('Partnership lookup failed:', partnershipError)
      return new Response(
        JSON.stringify({ success: false, message: '매장 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Build the review update payload ───────────────────────────────────
    const reviewPayload = {
      type:          'review',
      redemption_id,
      rating:        rating     ?? '',
      tags_string:   tags_string ?? '',
      comment:       comment     ?? '',
    }

    // ── POST to master sheet ───────────────────────────────────────────────
    const masterPromise = fetch(partnership.master_apps_script_url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(reviewPayload),
    })

    // ── POST to partner sheet (needs sheet_name to find the right tab) ─────
    const partnerPromise = fetch(partnership.partner_apps_script_url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...reviewPayload,
        sheet_name: partnership.sheet_name || partnership.name,
      }),
    })

    const [masterRes, partnerRes] = await Promise.all([masterPromise, partnerPromise])

    if (!masterRes.ok || !partnerRes.ok) {
      const masterText  = await masterRes.text()
      const partnerText = await partnerRes.text()
      console.error('Review sheet sync failed — master:', masterText, '| partner:', partnerText)
      // Don't return an error — the review is already saved in Supabase.
      // Sheet sync failure is non-critical.
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    console.error('sync-review-to-sheets fatal error:', err)
    return new Response(
      JSON.stringify({ success: false, message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
