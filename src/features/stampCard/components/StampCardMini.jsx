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
  const miniWidth = 120
  const previewWidth = 360
  const scale = miniWidth / previewWidth
  const miniHeight = miniWidth / 1.586

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <div
          style={{
            width: miniWidth,
            height: miniHeight,
            overflow: 'hidden',
            boxShadow: shouldHighlight
              ? `0 0 0 2px ${ORANGE}, 0 5px 12px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.12)`
              : '0 5px 12px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.12)',
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
              highlighted={shouldHighlight}
              highlightColor={ORANGE}
            />
          </div>
        </div>
        {statusText && (
          <span
            style={{
              color: ORANGE,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
              textShadow: '0 1px 2px rgba(255,255,255,0.9)',
              whiteSpace: 'nowrap',
            }}
          >
            {statusText}
          </span>
        )}
      </div>
    </button>
  )
}
