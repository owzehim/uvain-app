// ─────────────────────────────────────────────────────────────
// REVIEW TAGS
// These are the 4 positive multiple-choice options shown in the
// review modal. Keys are used in the database (text[]),
// labels are shown in the UI.
// Icons use Phosphor icon component names — no emoji.
// ─────────────────────────────────────────────────────────────

export const REVIEW_TAGS = [
  {
    key: 'GREAT_FOOD',
    label: '음식이 맛있어요',
    icon: 'BowlSteam',       // Phosphor: <BowlSteam />
  },
  {
    key: 'FRIENDLY_STAFF',
    label: '사장님이 친절해요',
    icon: 'HandHeart',       // Phosphor: <HandHeart />
  },
  {
    key: 'NICE_ATMOSPHERE',
    label: '분위기가 좋아요',
    icon: 'Sparkle',         // Phosphor: <Sparkle />
  },
  {
    key: 'GOOD_VALUE',
    label: '가성비가 좋아요',
    icon: 'CoinVertical',    // Phosphor: <CoinVertical />
  },
]

// Convenience: just the key strings, useful for validation
export const VALID_TAG_KEYS = REVIEW_TAGS.map((t) => t.key)

// ─────────────────────────────────────────────────────────────
// REVIEW PROMPT STATUS
// Matches the check constraint in Supabase:
//   check (status in ('pending', 'submitted', 'dismissed'))
// ─────────────────────────────────────────────────────────────

export const PROMPT_STATUS = {
  PENDING:   'pending',
  SUBMITTED: 'submitted',
  DISMISSED: 'dismissed',
}

// ─────────────────────────────────────────────────────────────
// SHAPE DOCUMENTATION (JSDoc — no TypeScript needed)
// These are not enforced at runtime but document what each
// object looks like throughout the app and in Supabase.
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Review
 * @property {string}   id             - UUID (from Supabase)
 * @property {number}   redemption_id  - FK → redemptions.id
 * @property {string}   user_id        - UUID of the reviewer
 * @property {string}   store_id       - FK → partnerships.id
 * @property {number}   rating         - 1–5 star rating
 * @property {string[]} tags           - subset of VALID_TAG_KEYS
 * @property {string}   [comment]      - optional free text
 * @property {string}   created_at     - ISO timestamp
 */

/**
 * @typedef {Object} ReviewPrompt
 * @property {string} id             - UUID
 * @property {number} redemption_id  - FK → redemptions.id
 * @property {string} user_id        - UUID
 * @property {string} store_id       - FK → partnerships.id
 * @property {string} prompt_at      - ISO timestamp (redeemed_at + 50 min)
 * @property {string} status         - one of PROMPT_STATUS values
 * @property {string} created_at     - ISO timestamp
 */

/**
 * @typedef {Object} StoreReviewSummary
 * @property {string}   store_id       - FK → partnerships.id
 * @property {number}   average_rating - e.g. 4.5
 * @property {number}   review_count   - total number of reviews
 * @property {Object}   tag_counts     - e.g. { GREAT_FOOD: 12, FRIENDLY_STAFF: 8, ... }
 */

/**
 * @typedef {Object} NewReviewInput
 * @property {number|null} rating   - 1–5, null if not yet selected
 * @property {string[]}    tags     - selected tag keys
 * @property {string}      [comment]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {{ rating?: string, tags?: string }} errors
 */
