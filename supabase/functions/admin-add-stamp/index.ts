import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getServiceKey() {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (direct) return direct

  try {
    const raw = Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'
    const parsed = JSON.parse(raw)
    return parsed.service_role_key || parsed.service_role || Object.values(parsed)[0] || ''
  } catch {
    return ''
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function computeStampState(visits: any[], totalStamps: number, pendingReward: any = null) {
  const totalVisits = visits.length

  if (pendingReward) {
    const currentCycle = pendingReward.card_cycle ?? Math.floor(Math.max(totalVisits - 1, 0) / totalStamps) + 1
    return {
      totalVisits,
      currentCycle,
      stampsInCurrentCycle: totalStamps,
      isCardFull: true,
      hasPendingReward: true,
      pendingReward,
      currentCycleVisits: visits
        .filter((visit) => visit.card_cycle === currentCycle)
        .slice(0, totalStamps),
    }
  }

  if (totalVisits === 0) {
    return {
      totalVisits: 0,
      currentCycle: 1,
      stampsInCurrentCycle: 0,
      isCardFull: false,
      hasPendingReward: false,
      pendingReward: null,
      currentCycleVisits: [],
    }
  }

  const remainder = totalVisits % totalStamps
  const currentCycle = Math.floor(totalVisits / totalStamps) + 1
  const cycleStart = totalVisits - remainder

  return {
    totalVisits,
    currentCycle,
    stampsInCurrentCycle: remainder,
    isCardFull: false,
    hasPendingReward: false,
    pendingReward: null,
    currentCycleVisits: remainder === 0 ? [] : visits.slice(cycleStart, cycleStart + totalStamps),
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return json({ success: false, message: '로그인이 필요합니다.' }, 401)
    }

    const {
      action = 'addStamp',
      userId,
      restaurantId,
      totalStamps,
      visitedAt,
      adminNote,
    } = await req.json().catch(() => ({}))

    if (!restaurantId || (action === 'addStamp' && (!userId || !visitedAt))) {
      return json({ success: false, message: '잘못된 요청입니다.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = getServiceKey()

    if (!serviceKey) {
      console.error('No service key found')
      return json({ success: false, message: '서버 설정 오류입니다.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const caller = userData?.user

    if (userError || !caller) {
      console.error('Auth error:', userError)
      return json({ success: false, message: '로그인이 필요합니다.' }, 401)
    }

    const isAdmin =
      caller.user_metadata?.role === 'admin' ||
      caller.app_metadata?.role === 'admin' ||
      caller.email === 'admin@uvain.nl'

    if (!isAdmin) {
      return json({ success: false, message: '관리자 권한이 필요합니다.' }, 403)
    }

    const safeTotalStamps = Math.max(1, Number(totalStamps || 10))

    if (action === 'listMembers') {
      const { data: members, error: membersError } = await admin
        .from('members')
        .select('id, user_id, first_name, last_name')
        .not('user_id', 'is', null)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (membersError) throw membersError
      if (!members?.length) return json({ success: true, rows: [] })

      const rows = await Promise.all(
        members.map(async (member) => {
          const { data: visits, error: visitsError } = await admin
            .from('stamp_card_visits')
            .select('*')
            .eq('user_id', member.user_id)
            .eq('restaurant_id', restaurantId)
            .order('visited_at', { ascending: true })

          if (visitsError) throw visitsError

          const { data: latestRewardRows, error: rewardsError } = await admin
            .from('stamp_card_rewards')
            .select('*')
            .eq('user_id', member.user_id)
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(1)

          if (rewardsError) throw rewardsError

          const latestReward = latestRewardRows?.[0] ?? null
          const pendingReward = latestReward?.redeemed === false ? latestReward : null

          return {
            member,
            stampState: computeStampState(visits ?? [], safeTotalStamps, pendingReward),
            latestReward,
          }
        }),
      )

      return json({ success: true, rows })
    }

    const { data: targetMember, error: targetMemberError } = await admin
      .from('members')
      .select('id, user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (targetMemberError) throw targetMemberError
    if (!targetMember) {
      return json({ success: false, message: '멤버 계정과 연결된 사용자를 찾을 수 없습니다.' }, 404)
    }

    const { data: pendingReward, error: pendingRewardError } = await admin
      .from('stamp_card_rewards')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('redeemed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pendingRewardError) throw pendingRewardError

    if (pendingReward) {
      return json({
        success: true,
        rewardPending: true,
        cycleCompleted: true,
        cardCycle: pendingReward.card_cycle,
      })
    }

    const { data: priorVisits, error: fetchError } = await admin
      .from('stamp_card_visits')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)

    if (fetchError) throw fetchError

    const priorCount = priorVisits?.length ?? 0
    const cardCycle = Math.floor(priorCount / safeTotalStamps) + 1

    const { error: insertError } = await admin
      .from('stamp_card_visits')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        visited_at: visitedAt,
        card_cycle: cardCycle,
        added_by_admin: true,
        admin_note: adminNote || null,
      })

    if (insertError) throw insertError

    const newCount = priorCount + 1
    const cycleCompleted = newCount % safeTotalStamps === 0

    if (cycleCompleted) {
      const { error: rewardError } = await admin
        .from('stamp_card_rewards')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          card_cycle: cardCycle,
          redeemed: false,
        })

      if (rewardError) throw rewardError
    }

    return json({
      success: true,
      newCount,
      cardCycle,
      cycleCompleted,
    })
  } catch (err) {
    console.error('admin-add-stamp fatal error:', err)
    return json({
      success: false,
      message: err instanceof Error ? err.message : '서버 오류가 발생했습니다.',
    }, 500)
  }
})
