import { useEffect, useRef, useState } from 'react'
import { useStampCardConfig } from '../hooks/useStampCardConfig'
import { useUserStampVisits } from '../hooks/useUserStampVisits'
import StampCard from './StampCard'

const ORANGE = '#f97316'

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

  const remaining = Math.max(config.total_stamps - stampState.stampsInCurrentCycle, 0)
  const isBenefitReady =
    stampState.hasPendingReward ||
    stampState.isCardFull ||
    stampState.stampsInCurrentCycle >= config.total_stamps
  const statusText = isBenefitReady
    ? '사용 가능'
    : remaining === 1
      ? '다음 방문 시 사용 가능'
      : ''
  const shouldHighlight = !!statusText
  const miniWidth = 108
  const framePadding = shouldHighlight ? 5 : 0
  const bottomBandHeight = shouldHighlight ? 24 : 0
  const previewWidth = 360
  const viewportWidth = miniWidth - framePadding * 2
  const viewportHeight = viewportWidth / 1.586
  const scale = viewportWidth / previewWidth

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
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: miniWidth,
          overflow: 'hidden',
          borderRadius: shouldHighlight ? 9 : 0,
          background: shouldHighlight ? ORANGE : 'transparent',
          padding: shouldHighlight ? `${framePadding}px ${framePadding}px 0` : 0,
          boxShadow: '0 5px 12px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            width: viewportWidth,
            height: viewportHeight,
            overflow: 'hidden',
            background: '#ffffff',
            borderRadius: shouldHighlight ? '4px 4px 0 0' : 0,
          }}
        >
          <div
            style={{
              width: previewWidth,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <StampCard
              size="full"
              config={config}
              visits={stampState.currentCycleVisits}
              isCardFull={stampState.isCardFull}
            />
          </div>
        </div>
        {statusText && (
          <div
            style={{
              height: bottomBandHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {statusText}
          </div>
        )}
      </div>
    </button>
  )
}
