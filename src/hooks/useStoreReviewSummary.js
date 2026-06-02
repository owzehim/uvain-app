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
import { getStoreReviewSummary } from '../api/reviewApi'

export function useStoreReviewSummary(storeId) {
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    // Don't fetch if no store is selected
    if (!storeId) {
      setSummary(null)
      return
    }

    let cancelled = false

    async function fetchSummary() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getStoreReviewSummary(storeId)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message ?? '리뷰를 불러오지 못했습니다.')
        setSummary(null)
      } else {
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
