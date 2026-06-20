import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })

  const isAdmin =
    user.user_metadata?.role === 'admin' || user.email === 'admin@uvain.nl'
  if (!isAdmin) return res.status(403).json({ error: 'Forbidden' })

  const { action, payload } = req.body

  if (action === 'listUsers') {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // add more actions here as needed

  return res.status(400).json({ error: 'Unknown action' })
}