import { useEffect, useRef, useState } from 'react'
import { useStampCardConfig } from '../hooks/useStampCardConfig'
import { useUserStampVisits } from '../hooks/useUserStampVisits'
import StampCard from './StampCard'

export default function StampCardMini({ restaurantId, userId, onOpenModal }) {
  const { config, loading } = useStampCardConfig(restaurantId)
  const { stampState } = useUserStampVisits({
    userId,
    restaurantId,
    totalStamps: config?.total_stamps,
  })

  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!loading && config) {
      // slight delay so the slide-in plays after mount
      timerRef.current = setTimeout(() => setVisible(true), 30)
    } else {
      setVisible(false)
    }
    return () => clearTimeout(timerRef.current)
  }, [loading, config])

  if (loading || !config) return null

  return (
    <button
      onClick={onOpenModal}
      aria-label="스탬프 카드 열기"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1100,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        transform: visible ? 'translateX(0)' : 'translateX(130%)',
        transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <StampCard
        size="mini"
        config={config}
        visits={stampState.currentCycleVisits}
        isCardFull={stampState.isCardFull}
      />
    </button>
  )
}
