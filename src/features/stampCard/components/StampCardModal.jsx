import { useEffect, useRef, useState } from 'react'
import { useStampCardConfig } from '../hooks/useStampCardConfig'
import { useUserStampVisits } from '../hooks/useUserStampVisits'
import StampCard from './StampCard'

export default function StampCardModal({ restaurantId, userId, onClose }) {
  const { config, loading } = useStampCardConfig(restaurantId, { useDefault: true })
  const { stampState } = useUserStampVisits({
    userId,
    restaurantId,
    totalStamps: config?.total_stamps,
  })

  const [visible, setVisible] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => onClose?.(), 250)
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current == null || touchStartY.current == null) return

    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDy > absDx && absDy > 60) {
      handleClose()
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      onClick={handleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: visible ? 'rgba(0,0,0,0.86)' : 'rgba(0,0,0,0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        transition: 'background 250ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          transform: visible ? 'scale(1)' : 'scale(0.92)',
          opacity: visible ? 1 : 0,
          transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1), opacity 250ms ease',
        }}
      >
        {!loading && config && (
          <StampCard
            size="full"
            config={config}
            visits={stampState.currentCycleVisits}
            isCardFull={stampState.isCardFull}
          />
        )}
      </div>
    </div>
  )
}
