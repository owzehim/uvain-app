import { useEffect, useRef, useState } from 'react'
import { useStampCardConfig } from '../hooks/useStampCardConfig'
import { useUserStampVisits } from '../hooks/useUserStampVisits'
import StampCard from './StampCard'

export default function StampCardMini({ restaurantId, userId, open = true, onOpenModal, onExited }) {
  const { config, loading } = useStampCardConfig(restaurantId, { useDefault: true })
  const { stampState } = useUserStampVisits({
    userId,
    restaurantId,
    totalStamps: config?.total_stamps,
  })

  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)

    if (!loading && config && open) {
      timerRef.current = setTimeout(() => setVisible(true), 30)
    } else {
      setVisible(false)
      if (!open) {
        timerRef.current = setTimeout(() => onExited?.(), 350)
      }
    }
    return () => clearTimeout(timerRef.current)
  }, [loading, config, open, onExited])

  if (loading || !config) return null

  return (
    <button
      onClick={onOpenModal}
      aria-label="스탬프 카드 열기"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 900,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        borderRadius: 0,
        transform: visible ? 'translateX(0)' : 'translateX(130%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: visible ? 'auto' : 'none',
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
