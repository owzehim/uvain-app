// ─────────────────────────────────────────────────────────────
// REVIEW API
// All Supabase calls related to reviews.
// No React, no UI logic, no domain rules — just data access.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'
import { buildReviewSummary } from '../domain/reviewDomain'
import { tagsToSheetString } from '../domain/reviewDomain'

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

/**
 * Inserts a new review into Supabase.
 * Also triggers the Google Sheets row update via Edge Function.
 *
 * @param {{
 *   redemptionId: number,
 *   storeId: string,
 *   rating: number,
 *   tags: string[],
 *   comment?: string
 * }} params
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createReview({ redemptionId, storeId, rating, tags, comment }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: '로그인이 필요합니다.' } }
  }

  // 1. Insert review into Supabase
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      redemption_id: redemptionId,
      user_id:       user.id,
      store_id:      storeId,
      rating,
      tags,
      comment:       comment || null,
    })
    .select()
    .single()

  if (error) {
    console.error('createReview error:', error)
    return { data: null, error }
  }

  // 2. Trigger Google Sheets update via Edge Function (fire and forget)
  // We don't await this — if it fails, the review is still saved in Supabase
  syncReviewToSheets({ redemptionId, storeId, rating, tags, comment, userId: user.id })
    .catch((err) => console.warn('Sheet sync failed (non-critical):', err?.message))

  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

/**
 * Fetches all reviews for a given store.
 * Used to compute the review summary shown on SpotCard.
 *
 * @param {string} storeId
 * @returns {Promise<{ data: object[]|null, error: object|null }>}
 */
export async function getReviewsByStore(storeId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, tags, comment, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getReviewsByStore error:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetches the review summary for a store (average rating, count, tag counts).
 * Calls getReviewsByStore and computes via domain layer.
 *
 * @param {string} storeId
 * @returns {Promise<{
 *   data: { store_id: string, average_rating: number, review_count: number, tag_counts: object }|null,
 *   error: object|null
 * }>}
 */
export async function getStoreReviewSummary(storeId) {
  const { data: reviews, error } = await getReviewsByStore(storeId)
  if (error) return { data: null, error }

  const summary = buildReviewSummary(storeId, reviews ?? [])
  return { data: summary, error: null }
}

/**
 * Checks if the current user has already reviewed a specific redemption.
 * Used to guard against duplicate reviews.
 *
 * @param {number} redemptionId
 * @returns {Promise<boolean>}
 */
export async function hasUserReviewedRedemption(redemptionId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('redemption_id', redemptionId)
    .maybeSingle()

  if (error) {
    console.error('hasUserReviewedRedemption error:', error)
    return false
  }

  return data !== null
}

// ─────────────────────────────────────────────────────────────
// GOOGLE SHEETS SYNC (internal — not exported directly)
// Calls the existing Edge Function to update the scan row
// in both master and partner sheets with review data.
// ─────────────────────────────────────────────────────────────

/**
 * @param {{
 *   redemptionId: number,
 *   storeId: string,
 *   rating: number,
 *   tags: string[],
 *   comment?: string,
 *   userId: string
 * }} params
 */
async function syncReviewToSheets({ redemptionId, storeId, rating, tags, comment, userId }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await supabase.functions.invoke('sync-review-to-sheets', {
    body: {
      redemption_id: redemptionId,
      store_id:      storeId,
      user_id:       userId,
      rating,
      tags_string:   tagsToSheetString(tags),   // '음식이 맛있어요, 가성비가 좋아요'
      comment:       comment || '',
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })
}
