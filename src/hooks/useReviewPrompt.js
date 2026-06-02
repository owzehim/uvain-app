// ─────────────────────────────────────────────────────────────
// useReviewPrompt
// Manages the full lifecycle of a review prompt:
//   1. On mount → check if a review prompt is due
//   2. If due  → open the modal automatically
//   3. On submit → save review, mark prompt submitted, close modal
//   4. On skip  → mark prompt dismissed, close modal
//
// Used in: MemberPage.jsx (mounted once when member home loads)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { getPendingReviewPrompt, markPromptSubmitted, markPromptDismissed } from '../api/reviewPromptApi'
import { createReview } from '../api/reviewApi'
import { validateReviewInput } from '../domain/reviewDomain'

export function useReviewPrompt() {
  // The pending prompt fetched from Supabase (null = nothing to show)
  const [prompt, setPrompt]       = useState(null)

  // Modal open/close state
  const [open, setOpen]           = useState(false)

  // Form state inside the modal
  const [rating, setRating]       = useState(null)   // 1–5 or null
  const [tags, setTags]           = useState([])     // string[]
  const [comment, setComment]     = useState('')

  // Async states
  const [loading, setLoading]     = useState(true)   // initial fetch
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]       = useState({})     // { rating?, tags? }
  const [submitError, setSubmitError] = useState(null)

  // Prevent double-fetch on StrictMode double-mount
  const fetchedRef = useRef(false)

  // ── 1. On mount: check for a due prompt ──────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function checkForPrompt() {
      setLoading(true)
      const { data, error } = await getPendingReviewPrompt()
      if (!error && data) {
        setPrompt(data)
        setOpen(true)
      }
      setLoading(false)
    }

    checkForPrompt()
  }, [])

  // ── 2. Tag toggle helper ──────────────────────────────────
  const toggleTag = useCallback((tagKey) => {
    setTags((prev) =>
      prev.includes(tagKey)
        ? prev.filter((t) => t !== tagKey)
        : [...prev, tagKey]
    )
    // Clear tag error as soon as user selects something
    setErrors((prev) => ({ ...prev, tags: undefined }))
  }, [])

  // ── 3. Star rating setter ─────────────────────────────────
  const selectRating = useCallback((value) => {
    setRating(value)
    setErrors((prev) => ({ ...prev, rating: undefined }))
  }, [])

  // ── 4. Submit review ──────────────────────────────────────
  const submitReview = useCallback(async () => {
    if (!prompt) return

    // Validate using domain layer (no Supabase involved)
    const validation = validateReviewInput({ rating, tags })
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    const { error: reviewError } = await createReview({
      redemptionId: prompt.redemption_id,
      storeId:      prompt.store_id,
      rating,
      tags,
      comment:      comment.trim() || undefined,
    })

    if (reviewError) {
      setSubmitError('리뷰 저장에 실패했습니다. 다시 시도해주세요.')
      setSubmitting(false)
      return
    }

    // Mark prompt as submitted in Supabase
    await markPromptSubmitted(prompt.id)

    setSubmitting(false)
    closeModal()
  }, [prompt, rating, tags, comment])

  // ── 5. Skip / dismiss ─────────────────────────────────────
  const skipReview = useCallback(async () => {
    if (!prompt) return
    // Fire and forget — don't block the UI
    markPromptDismissed(prompt.id).catch((err) =>
      console.warn('markPromptDismissed failed:', err?.message)
    )
    closeModal()
  }, [prompt])

  // ── 6. Close and reset all form state ────────────────────
  function closeModal() {
    setOpen(false)
    // Small delay before resetting so closing animation isn't jarring
    setTimeout(() => {
      setPrompt(null)
      setRating(null)
      setTags([])
      setComment('')
      setErrors({})
      setSubmitError(null)
    }, 350)
  }

  // ── Derived: store name for modal header ─────────────────
  // prompt.partnerships is the joined object from Supabase:
  // { name: 'Northeast Kitchen' }
  const storeName = prompt?.partnerships?.name ?? prompt?.store_id ?? '매장'

  return {
    // State
    loading,
    open,
    prompt,
    storeName,

    // Form state
    rating,
    tags,
    comment,
    errors,
    submitError,
    submitting,

    // Actions
    selectRating,
    toggleTag,
    setComment,
    submitReview,
    skipReview,
  }
}
