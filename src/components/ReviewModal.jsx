// ─────────────────────────────────────────────────────────────
// ReviewModal
// The popup shown to members 50 minutes after a store visit.
// Receives all state and actions from useReviewPrompt hook —
// this component is purely presentational.
//
// Layout:
//   1. Header     — store name + close button
//   2. Stars      — 1–5 tap to select
//   3. Tag chips  — multi-select, at least one required
//   4. Comment    — optional textarea
//   5. Submit     — disabled until valid
// ─────────────────────────────────────────────────────────────

import { Star, BowlSteam, HandHeart, Sparkle, CoinVertical, X } from '@phosphor-icons/react'
import { REVIEW_TAGS } from '../domain/reviewTypes'

// ── Icon map — keyed by tag.icon string from reviewTypes ─────
const TAG_ICONS = {
  BowlSteam:    BowlSteam,
  HandHeart:    HandHeart,
  Sparkle:      Sparkle,
  CoinVertical: CoinVertical,
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: Star row
// ─────────────────────────────────────────────────────────────
function StarRow({ rating, onSelect, error }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-medium text-gray-700">별점을 선택해주세요</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className="p-1 transition-transform active:scale-90"
            aria-label={`${value}점`}
          >
            <Star
              size={36}
              weight={rating !== null && value <= rating ? 'fill' : 'regular'}
              color={rating !== null && value <= rating ? '#f97316' : '#d1d5db'}
            />
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: Tag chip
// ─────────────────────────────────────────────────────────────
function TagChip({ tag, selected, onToggle }) {
  const IconComponent = TAG_ICONS[tag.icon]

  return (
    <button
      onClick={() => onToggle(tag.key)}
      className={`
        flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-sm font-medium
        transition-all active:scale-95
        ${selected
          ? 'bg-orange-500 border-orange-500 text-white'
          : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
        }
      `}
    >
      {IconComponent && (
        <IconComponent
          size={16}
          weight={selected ? 'fill' : 'regular'}
          color={selected ? '#ffffff' : '#9ca3af'}
        />
      )}
      {tag.label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ReviewModal({
  open,
  storeName,
  rating,
  tags,
  comment,
  errors,
  submitError,
  submitting,
  onSelectRating,
  onToggleTag,
  onCommentChange,
  onSubmit,
  onSkip,
}) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[1100]"
        onClick={onSkip}
      />

      {/* Modal sheet — slides up from bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[1200] bg-white rounded-t-3xl"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
        // Prevent backdrop click from firing when tapping inside modal
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <div>
            <p className="text-xs text-orange-500 font-medium mb-0.5">방문 후기</p>
            <h2 className="text-base font-bold text-gray-900">
              {storeName}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              방문하셨나요? 솔직한 후기를 남겨주세요 😊
            </p>
          </div>
          <button
            onClick={onSkip}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex-shrink-0"
            aria-label="닫기"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-5 flex flex-col gap-6 pb-4">

          {/* ── Star rating ── */}
          <StarRow
            rating={rating}
            onSelect={onSelectRating}
            error={errors.rating}
          />

          {/* ── Tag chips ── */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">
              어떤 점이 좋았나요?
              <span className="text-gray-400 font-normal ml-1">(복수 선택 가능)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => (
                <TagChip
                  key={tag.key}
                  tag={tag}
                  selected={tags.includes(tag.key)}
                  onToggle={onToggleTag}
                />
              ))}
            </div>
            {errors.tags && (
              <p className="text-xs text-red-500">{errors.tags}</p>
            )}
          </div>

          {/* ── Optional comment ── */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">
              한 줄 후기
              <span className="text-gray-400 font-normal ml-1">(선택)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="자유롭게 남겨주세요..."
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:border-orange-400 placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-400 text-right">
              {comment.length}/200
            </p>
          </div>

          {/* ── Server error ── */}
          {submitError && (
            <p className="text-xs text-red-500 text-center">{submitError}</p>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="w-full py-3.5 bg-orange-500 text-white font-semibold rounded-2xl text-sm
                         hover:bg-orange-600 active:scale-[0.98] transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? '저장 중...' : '후기 남기기'}
            </button>
            <button
              onClick={onSkip}
              disabled={submitting}
              className="w-full py-3 text-gray-400 text-sm hover:text-gray-600 transition-colors"
            >
              다음에 할게요
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
