import { useEffect, useState } from 'react'
import { Octagon, CheckCircle } from '@phosphor-icons/react'
import { useStampCardConfig } from '../hooks/useStampCardConfig'
import { useUserStampVisits } from '../hooks/useUserStampVisits'
import { fetchPendingReward, redeemReward } from '../api/stampCardRewards'

export default function ScanPageStampBox({
  restaurantId,
  userId,
  scanResult,   // null | { alreadyStamped, cycleCompleted, newCount, cardCycle }
  onRewardRedeemed,
}) {
  const { config } = useStampCardConfig(restaurantId)
  const { stampState, refetch } = useUserStampVisits({
    userId,
    restaurantId,
    totalStamps: config?.total_stamps,
  })

  const [pendingReward, setPendingReward] = useState(null)
  const [redeemed, setRedeemed] = useState(false)
  const [redeeming, setRedeeming] = useState(false)

  // Fetch pending reward on mount and after a scan
  useEffect(() => {
    if (!userId || !restaurantId) return
    fetchPendingReward(userId, restaurantId)
      .then(setPendingReward)
      .catch(() => setPendingReward(null))
  }, [userId, restaurantId, scanResult])

  // Refetch visits after a successful scan so stamp icons update
  useEffect(() => {
    if (scanResult && !scanResult.alreadyStamped) refetch()
  }, [scanResult]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!config) return null

  const { total_stamps, accent_color, reward_text } = config
  const { stampsInCurrentCycle, isCardFull } = stampState

  const handleRedeem = async () => {
    if (!pendingReward) return
    setRedeeming(true)
    try {
      await redeemReward(pendingReward.id)
      setRedeemed(true)
      setPendingReward(null)
      onRewardRedeemed?.()
    } catch {
      // silent — employee can try again
    } finally {
      setRedeeming(false)
    }
  }

  // ── State: already stamped today ──────────────────────────────────────────
  if (scanResult?.alreadyStamped) {
    return (
      <BoxShell borderColor="#e5e7eb">
        <Row>
          <StampIcons count={stampsInCurrentCycle} total={total_stamps} accentColor="#9ca3af" />
          <CountLabel current={stampsInCurrentCycle} total={total_stamps} />
        </Row>
        <p className="text-xs text-gray-400 mt-1 text-center">
          오늘은 이미 스탬프가 적립되었어요
        </p>
      </BoxShell>
    )
  }

  // ── State: cycle just completed this scan ─────────────────────────────────
  if (scanResult?.cycleCompleted) {
    return (
      <BoxShell borderColor={accent_color} bg="bg-orange-50">
        <p className="text-sm font-bold text-center mb-2" style={{ color: accent_color }}>
          🎉 스탬프 카드 완성!
        </p>
        <Row>
          <StampIcons count={total_stamps} total={total_stamps} accentColor={accent_color} />
          <CountLabel current={total_stamps} total={total_stamps} />
        </Row>
        {(reward_text || true) && (
          <p className="text-xs text-center mt-1 font-medium" style={{ color: accent_color }}>
            {reward_text || '리워드를 획득하셨습니다'}
          </p>
        )}
        {!redeemed ? (
          <button
            onClick={handleRedeem}
            disabled={redeeming}
            className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5"
            style={{ background: accent_color, opacity: redeeming ? 0.7 : 1 }}
          >
            <CheckCircle size={16} weight="fill" />
            {redeeming ? '처리 중...' : '리워드 제공 완료 ✓'}
          </button>
        ) : (
          <p className="mt-3 text-xs text-center text-gray-400">리워드 사용됨</p>
        )}
      </BoxShell>
    )
  }

  // ── State: pending unredeemed reward from a previous cycle ────────────────
  if (pendingReward && !redeemed) {
    return (
      <BoxShell borderColor={accent_color} bg="bg-orange-50">
        <p className="text-sm font-bold text-center mb-2" style={{ color: accent_color }}>
          미사용 리워드가 있어요!
        </p>
        <Row>
          <StampIcons count={stampsInCurrentCycle} total={total_stamps} accentColor={accent_color} />
          <CountLabel current={stampsInCurrentCycle} total={total_stamps} />
        </Row>
        {reward_text && (
          <p className="text-xs text-center mt-1 font-medium" style={{ color: accent_color }}>
            {reward_text}
          </p>
        )}
        <button
          onClick={handleRedeem}
          disabled={redeeming}
          className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5"
          style={{ background: accent_color, opacity: redeeming ? 0.7 : 1 }}
        >
          <CheckCircle size={16} weight="fill" />
          {redeeming ? '처리 중...' : '리워드 제공 완료 ✓'}
        </button>
      </BoxShell>
    )
  }

  // ── State: normal progress ────────────────────────────────────────────────
  return (
    <BoxShell borderColor={accent_color}>
      <Row>
        <StampIcons count={stampsInCurrentCycle} total={total_stamps} accentColor={accent_color} />
        <CountLabel current={stampsInCurrentCycle} total={total_stamps} />
      </Row>
    </BoxShell>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BoxShell({ children, borderColor, bg = 'bg-white' }) {
  return (
    <div
      className={`w-full rounded-xl px-4 py-3 border-2 ${bg}`}
      style={{ borderColor }}
    >
      <p className="text-xs text-gray-400 mb-2">스탬프</p>
      {children}
    </div>
  )
}

function Row({ children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {children}
    </div>
  )
}

function StampIcons({ count, total, accentColor }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: total }, (_, i) => (
        <Octagon
          key={i}
          size={20}
          weight={i < count ? 'fill' : 'regular'}
          color={i < count ? accentColor : '#d1d5db'}
        />
      ))}
    </div>
  )
}

function CountLabel({ current, total }) {
  return (
    <span className="text-xs font-semibold text-gray-500 whitespace-nowrap shrink-0">
      {current} / {total}
    </span>
  )
}
