// ─────────────────────────────────────────────────────────────
// useStoreReviewSummary
// Fetches and returns the review summary for a single store.
// Used by SpotCard to display:
//   - Average star rating + count  (section 1: place info)
//   - Tag breakdown                (section 3: multiple choice results)
//
// Only fetches when a store is actually selected (storeId truthy).
// Re-fetches automatically when a different store is selected.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { getStoreReviewSummaries, getStoreReviewSummary } from '../api/reviewApi'

const summaryCache = new Map()

export async function primeStoreReviewSummaries(storeIds) {
  const missingStoreIds = Array.from(
    new Set((storeIds || []).filter((storeId) => storeId && !summaryCache.has(storeId))),
  )
  if (missingStoreIds.length === 0) return

  const { data } = await getStoreReviewSummaries(missingStoreIds)
  for (const summary of data || []) {
    summaryCache.set(summary.store_id, summary)
  }
}

export function useStoreReviewSummary(storeId) {
  const cachedSummary = storeId ? summaryCache.get(storeId) ?? null : null
  const [summary, setSummary]   = useState(cachedSummary)
  const [loading, setLoading]   = useState(Boolean(storeId && !cachedSummary))
  const [error, setError]       = useState(null)

  useEffect(() => {
    // Don't fetch if no store is selected
    if (!storeId) {
      setSummary(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const cached = summaryCache.get(storeId)

    if (cached) {
      setSummary(cached)
      setLoading(false)
    } else {
      setSummary(null)
      setLoading(true)
    }

    async function fetchSummary() {
      setError(null)

      const { data, error: fetchError } = await getStoreReviewSummary(storeId)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message ?? '리뷰를 불러오지 못했습니다.')
        if (!cached) setSummary(null)
      } else {
        summaryCache.set(storeId, data)
        setSummary(data)
      }

      setLoading(false)
    }

    fetchSummary()

    // Cleanup: if storeId changes before fetch completes, ignore stale result
    return () => { cancelled = true }
  }, [storeId])

  return { summary, loading, error }
}
