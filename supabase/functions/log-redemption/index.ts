import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0"

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    )
  }

  const authHeader = req.headers.get("Authorization") ?? ""
  const jwt = authHeader.replace("Bearer ", "").trim()

  if (!jwt) {
    return new Response(
      JSON.stringify({ success: false, message: "Missing bearer token" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({ success: false, message: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )
  }

  const body = await req.json().catch(() => null)

  if (!body) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  // body fields: userId, storeId, storeName, fullName, studentNumber, major, yearInUni, membershipValidUntil
  console.log("[log-redemption] user:", user.id, "| payload:", body)

  // TODO: Google Sheets webhook
  // const webhookUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL")
  // if (webhookUrl) {
  //   await fetch(webhookUrl, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ ...body, userId: user.id, timestamp: new Date().toISOString() }),
  //   })
  // }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
})
