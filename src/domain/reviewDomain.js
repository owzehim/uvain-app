// ─────────────────────────────────────────────────────────────
// PURE BUSINESS LOGIC — no React, no Supabase, no DOM
// Safe to copy into a React Native project as-is.
// ─────────────────────────────────────────────────────────────

import { VALID_TAG_KEYS, REVIEW_TAGS } from './reviewTypes'

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validates a review input before submission.
 * Returns { valid: true } or { valid: false, errors: { ... } }
 *
 * @param {{ rating: number|null, tags: string[], comment?: string }} input
 * @returns {{ valid: boolean, errors: { rating?: string, tags?: string } }}
 */
export function validateReviewInput({ rating, tags }) {
  const errors = {}

  if (!rating || rating < 0.5 || rating > 5 || (rating * 2) !== Math.floor(rating * 2)) {
    errors.rating = '별점을 선택해주세요.'
  }

  if (!tags || tags.length === 0) {
    errors.tags = '하나 이상의 항목을 선택해주세요.'
  } else {
    const invalidTags = tags.filter((t) => !VALID_TAG_KEYS.includes(t))
    if (invalidTags.length > 0) {
      errors.tags = '유효하지 않은 항목이 포함되어 있습니다.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ─────────────────────────────────────────────────────────────
// PROMPT TIMING
// ─────────────────────────────────────────────────────────────

/**
 * Returns true if the review prompt is due (prompt_at <= now).
 * Uses string comparison via Date — no browser APIs needed.
 *
 * @param {{ prompt_at: string, status: string }} prompt
 * @param {Date} now
 * @returns {boolean}
 */
export function isPromptDue(prompt, now) {
  return new Date(prompt.prompt_at).getTime() <= now.getTime()
}

/**
 * Returns true if the prompt is still pending (not yet submitted or dismissed).
 *
 * @param {{ status: string }} prompt
 * @returns {boolean}
 */
export function isPromptPending(prompt) {
  return prompt.status === 'pending'
}

/**
 * Returns true if the prompt should be shown right now.
 * Combines both checks: pending + due.
 *
 * @param {{ prompt_at: string, status: string }} prompt
 * @param {Date} now
 * @returns {boolean}
 */
export function shouldShowReviewPrompt(prompt, now) {
  return isPromptPending(prompt) && isPromptDue(prompt, now)
}

// ─────────────────────────────────────────────────────────────
// AGGREGATIONS
// Used to compute what is displayed on the SpotCard.
// ─────────────────────────────────────────────────────────────

/**
 * Computes the average star rating from an array of reviews.
 * Returns 0 if there are no reviews.
 *
 * @param {Array<{ rating: number }>} reviews
 * @returns {number} e.g. 4.5
 */
export function computeAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return parseFloat((sum / reviews.length).toFixed(1))
}

/**
 * Counts how many times each tag was selected across all reviews.
 * Returns an object keyed by tag key with count values.
 *
 * @param {Array<{ tags: string[] }>} reviews
 * @returns {Object} e.g. { GREAT_FOOD: 12, FRIENDLY_STAFF: 8, NICE_ATMOSPHERE: 5, GOOD_VALUE: 3 }
 */
export function computeTagCounts(reviews) {
  const counts = Object.fromEntries(VALID_TAG_KEYS.map((k) => [k, 0]))
  if (!reviews || reviews.length === 0) return counts

  for (const review of reviews) {
    for (const tag of review.tags) {
      if (counts[tag] !== undefined) {
        counts[tag]++
      }
    }
  }
  return counts
}

/**
 * Returns the full StoreReviewSummary object computed from raw reviews.
 * This is what gets passed to SpotCard as reviewSummary.
 *
 * @param {string} storeId
 * @param {Array<{ rating: number, tags: string[] }>} reviews
 * @returns {{ store_id: string, average_rating: number, review_count: number, tag_counts: Object }}
 */
export function buildReviewSummary(storeId, reviews) {
  return {
    store_id:       storeId,
    average_rating: computeAverageRating(reviews),
    review_count:   reviews.length,
    tag_counts:     computeTagCounts(reviews),
  }
}

// ─────────────────────────────────────────────────────────────
// DISPLAY HELPERS
// Pure formatting — safe for both web and React Native.
// ─────────────────────────────────────────────────────────────

/**
 * Formats the average rating for display.
 * e.g. 4.5 → "4.5"  |  4.0 → "4.0"  |  0 → null (don't show)
 *
 * @param {number} averageRating
 * @returns {string|null}
 */
export function formatAverageRating(averageRating) {
  if (!averageRating || averageRating === 0) return null
  return averageRating.toFixed(1)
}

/**
 * Returns how many stars to render as filled vs empty.
 * Used to drive a star row in the UI without any DOM logic.
 *
 * @param {number} averageRating  e.g. 4.3
 * @returns {{ filled: number, half: boolean, empty: number }}
 *   e.g. { filled: 4, half: false, empty: 1 } for 4.3
 *   e.g. { filled: 4, half: true,  empty: 0 } for 4.5
 */
export function computeStarDisplay(averageRating) {
  const floored = Math.floor(averageRating)
  const decimal = averageRating - floored
  const half    = decimal >= 0.3 && decimal < 0.8
  const filled  = half ? floored : decimal >= 0.8 ? floored + 1 : floored
  const empty   = 5 - filled - (half ? 1 : 0)

  return { filled, half, empty }
}

/**
 * Returns the sorted tag list for display — highest count first.
 * Only includes tags with at least 1 count.
 *
 * @param {Object} tagCounts  e.g. { GREAT_FOOD: 12, FRIENDLY_STAFF: 0, ... }
 * @returns {Array<{ key: string, label: string, icon: string, count: number }>}
 */
export function getSortedTagsForDisplay(tagCounts) {
  return REVIEW_TAGS
    .map((tag) => ({ ...tag, count: tagCounts[tag.key] ?? 0 }))
    .filter((tag) => tag.count > 0)
    .sort((a, b) => b.count - a.count)
}

/**
 * Converts a tags array to an English string for Google Sheets.
 * The UI still shows Korean labels — only the sheet output changes.
 *
 * e.g. ['GREAT_FOOD', 'GOOD_VALUE'] → 'Great food, Good value'
 *
 * Falls back to the raw key if labelEn is somehow missing.
 *
 * @param {string[]} tags
 * @returns {string}
 */
export function tagsToSheetString(tags) {
  return tags
    .map((key) => REVIEW_TAGS.find((t) => t.key === key)?.labelEn ?? key)
    .join(', ')
}