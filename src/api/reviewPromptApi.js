// ─────────────────────────────────────────────────────────────
// REVIEW PROMPT API
// Supabase calls for managing review_prompts.
// No React, no UI logic, no domain rules — just data access.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'
import { shouldShowReviewPrompt } from '../domain/reviewDomain'

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

/**
 * Fetches the next review prompt that is due for the current user.
 * Returns the first pending prompt where prompt_at <= now.
 * Returns null if there is nothing to show.
 *
 * Called on app load (e.g. when MemberPage mounts).
 *
 * @returns {Promise<{
 *   data: {
 *     id: string,
 *     redemption_id: number,
 *     store_id: string,
 *     prompt_at: string,
 *     status: string,
 *     partnerships: { name: string }
 *   }|null,
 *   error: object|null
 * }>}
 */
export async function getPendingReviewPrompt() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { data: null, error: { message: '로그인이 필요합니다.' } }

  // Fetch all pending prompts for this user, joined with store name
  // We join partnerships to get the store name for the modal header
  const { data, error } = await supabase
    .from('review_prompts')
    .select(`
      id,
      redemption_id,
      store_id,
      prompt_at,
      status,
      partnerships ( name )
    `)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('prompt_at', { ascending: true })

  if (error) {
    console.error('getPendingReviewPrompt error:', error)
    return { data: null, error }
  }

  if (!data || data.length === 0) return { data: null, error: null }

  // Use domain logic to find the first one that is actually due
  const now = new Date()
  const duePrompt = data.find((p) => shouldShowReviewPrompt(p, now))

  return { data: duePrompt ?? null, error: null }
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

/**
 * Marks a review prompt as submitted.
 * Called after a review is successfully saved.
 *
 * @param {string} promptId - UUID of the review_prompt row
 * @returns {Promise<{ error: object|null }>}
 */
export async function markPromptSubmitted(promptId) {
  const { error } = await supabase
    .from('review_prompts')
    .update({ status: 'submitted' })
    .eq('id', promptId)

  if (error) console.error('markPromptSubmitted error:', error)
  return { error: error ?? null }
}

/**
 * Marks a review prompt as dismissed.
 * Called when the user closes the modal without submitting.
 *
 * @param {string} promptId - UUID of the review_prompt row
 * @returns {Promise<{ error: object|null }>}
 */
export async function markPromptDismissed(promptId) {
  const { error } = await supabase
    .from('review_prompts')
    .update({ status: 'dismissed' })
    .eq('id', promptId)

  if (error) console.error('markPromptDismissed error:', error)
  return { error: error ?? null }
}
