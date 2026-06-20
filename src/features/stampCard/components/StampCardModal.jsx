import { useEffect, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { useStampCardConfig } from '../hooks/useStampCardConfig'
import { useUserStampVisits } from '../hooks/useUserStampVisits'
import { fetchPendingReward } from '../api/rewards'
import StampCard from './StampCard'

export default function StampCardModal({ restaurantId, userId, onClose }) {
  const { config, loading } = useStampCardConfig(restaurantId, { useDefault: true })
  const { stampState } = useUserStampVisits({
    userId,
    restaurantId,
    totalStamps: config?.total_stamps,
  })

  const [reward, setReward] = useState(undefined) // undefined = not yet fetched
  const [slideIn, setSlideIn] = useState(false)
  const timerRef = useRef(null)

  // Slide-up animation on mount
  useEffect(() => {
    timerRef.current = setTimeout(() => setSlideIn(true), 30)
    return () => clearTimeout(timerRef.current)
  }, [])

  // Fetch pending reward once config is ready
  useEffect(() => {
    if (!userId || !restaurantId) return
    fetchPendingReward(userId, restaurantId)
      .then(setReward)
      .catch(() => setReward(null))
  }, [userId, restaurantId])

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      {/* Card container — stop propagation so tapping card doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          transform: slideIn ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} color="#ffffff" weight="bold" />
          </button>
        </div>

        {/* Stamp card */}
        {!loading && config && (
          <StampCard
            size="full"
            config={config}
            visits={stampState.currentCycleVisits}
            isCardFull={stampState.isCardFull}
          />
        )}

        {/* Reward status — shown below the card */}
        {reward !== undefined && config && (
          <RewardStatus reward={reward} config={config} />
        )}
      </div>
    </div>
  )
}

function RewardStatus({ reward, config }) {
  if (!reward) return null

  if (reward.redeemed) {
    return (
      <p style={{
        margin: 0,
        textAlign: 'center',
        fontSize: 13,
        color: '#9ca3af',
      }}>
        리워드 사용됨 · {reward.redeemed_at?.slice(0, 10)}
      </p>
    )
  }

  return (
    <p style={{
      margin: 0,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 600,
      color: config.accent_color,
    }}>
      {config.reward_text || '리워드를 획득하셨습니다'}
    </p>
  )
}
