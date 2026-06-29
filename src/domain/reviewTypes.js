// ─────────────────────────────────────────────────────────────
// REVIEW TAGS
// Each tag has:
//   key      → stored in Supabase (text[])
//   label    → Korean UI label shown in the review modal
//   labelEn  → English label written to Google Sheets
//   icon     → Phosphor icon component name
// ─────────────────────────────────────────────────────────────

export const REVIEW_TAGS = [
  {
    key:     'GREAT_FOOD',
    label:   '음식이 맛있어요',    // shown in app UI (unchanged)
    labelEn: 'Great food',        // written to Google Sheets
    icon:    'BowlSteam',
  },
  {
    key:     'FRIENDLY_STAFF',
    label:   '사장님이 친절해요',
    labelEn: 'Friendly staff',
    icon:    'HandHeart',
  },
  {
    key:     'NICE_ATMOSPHERE',
    label:   '분위기가 좋아요',
    labelEn: 'Nice atmosphere',
    icon:    'Wine',
  },
  {
    key:     'GOOD_VALUE',
    label:   '가성비가 좋아요',
    labelEn: 'Good value',
    icon:    'CoinVertical',
  },
]

// Convenience: just the key strings, useful for validation
export const VALID_TAG_KEYS = REVIEW_TAGS.map((t) => t.key)

// ─────────────────────────────────────────────────────────────
// REVIEW PROMPT STATUS
// Matches the check constraint in Supabase:
// check (status in ('pending', 'submitted', 'dismissed'))
// ─────────────────────────────────────────────────────────────

export const PROMPT_STATUS = {
  PENDING:   'pending',
  SUBMITTED: 'submitted',
  DISMISSED: 'dismissed',
}

// ─────────────────────────────────────────────────────────────
// SHAPE DOCUMENTATION (JSDoc)
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Review
 * @property {string}   id             - UUID (from Supabase)
 * @property {number}   redemption_id  - FK → redemptions.id
 * @property {string}   user_id        - UUID of the reviewer
 * @property {string}   store_id       - FK → partnerships.id
 * @property {number}   rating         - 1–5 star rating
 * @property {string[]} tags           - subset of VALID_TAG_KEYS
 * @property {string}   [comment]      - optional free text (any language)
 * @property {string}   created_at     - ISO timestamp
 */

/**
 * @typedef {Object} ReviewPrompt
 * @property {string} id             - UUID
 * @property {number} redemption_id  - FK → redemptions.id
 * @property {string} user_id        - UUID
 * @property {string} store_id       - FK → partnerships.id
 * @property {string} prompt_at      - ISO timestamp (redeemed_at + 30 min)
 * @property {string} status         - one of PROMPT_STATUS values
 * @property {string} created_at     - ISO timestamp
 */

/**
 * @typedef {Object} StoreReviewSummary
 * @property {string} store_id        - FK → partnerships.id
 * @property {number} average_rating  - e.g. 4.5
 * @property {number} review_count    - total number of reviews
 * @property {Object} tag_counts      - e.g. { GREAT_FOOD: 12, FRIENDLY_STAFF: 8, ... }
 */

/**
 * @typedef {Object} NewReviewInput
 * @property {number|null} rating
 * @property {string[]}    tags
 * @property {string}      [comment]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {{ rating?: string, tags?: string }} errors
 */
