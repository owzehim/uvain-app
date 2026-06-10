import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MapView from '../components/MapView'
import { SpotCard, RichText } from '../components/SpotCard'
import { MAP_CATEGORIES, CATEGORY_ICONS_WHITE, CATEGORY_ICONS_ORANGE } from '../lib/mapCategories'
import { QrCode, Calendar, MapPin, Gear } from '@phosphor-icons/react'
import { useReviewPrompt } from '../hooks/useReviewPrompt'
import ReviewModal from '../components/ReviewModal'
import ActivityStatsCard from '../components/ActivityStatsCard'
import QRScanner from '../components/QRScanner'
import { logRedemption } from '../lib/redemption'

// avatar helpers (top-level so QRTab can use them)
const AVATAR_COLORS = ['#F97316', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

function getAvatarColor(seed) {
  const str = seed || 'default'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export default function MemberPage() {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('qr')
  const [tabKey, setTabKey] = useState(0)
  const [events, setEvents] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const navigate = useNavigate()

  // ── Review prompt hook ───────────────────────────────
  const {
    open: reviewOpen,
    storeName,
    rating,
    tags,
    comment,
    errors,
    submitError,
    submitting,
    selectRating,
    toggleTag,
    setComment,
    submitReview,
    skipReview,
  } = useReviewPrompt()
  // ────────────────────────────────────────────────────

  // Load user, member, events, restaurants
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('auth.getUser error:', userError)
        setLoading(false)
        return
      }

      // Admin flag from user metadata (same logic as App.jsx)
      const isAdminUser = user?.user_metadata?.role === 'admin'

      // Members: maybeSingle() so we don't get a 406 if the admin has no row in members
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberError) {
        console.warn('members error (can be normal if no row):', memberError.message)
      }

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })

      if (eventError) {
        console.error('events error:', eventError.message)
      }

      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })

      if (restaurantError) {
        console.error('restaurants error:', restaurantError.message)
      }

      setMember(memberData || null)
      setIsAdmin(isAdminUser)
      setEvents(eventData || [])
      setRestaurants(restaurantData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  // Prevent iOS edge-swipe
  useEffect(() => {
    const handler = (e) => {
      if (e.touches[0]?.clientX < 30) e.preventDefault()
    }
    document.addEventListener('touchstart', handler, { passive: false })
    return () => document.removeEventListener('touchstart', handler)
  }, [])

  const handleTabChange = (key) => {
    setActiveTab(key)
    setTabKey((prev) => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  const isValid =
    member?.is_member &&
    member?.membership_valid_until &&
    new Date(member.membership_valid_until) >= new Date()

  return (
    <div
      className="flex flex-col bg-gray-50 overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Review modal */}
      <ReviewModal
        open={reviewOpen}
        storeName={storeName}
        rating={rating}
        tags={tags}
        comment={comment}
        errors={errors}
        submitError={submitError}
        submitting={submitting}
        onSelectRating={selectRating}
        onToggleTag={toggleTag}
        onCommentChange={setComment}
        onSubmit={submitReview}
        onSkip={skipReview}
      />

      {/* 헤더 */}
      <div
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <h1 className="font-bold text-gray-900">UvA-IN</h1>
        <div className="flex gap-2 items-center">
          {isAdmin && (
            <button
              onClick={() => {
                window.location.href = '/admin'
              }}
              className="text-sm text-white font-medium px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              관리자
            </button>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Settings"
          >
            <Gear size={20} weight="bold" />
          </button>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        <div key={tabKey} className="h-full">
          {activeTab === 'qr' && <QRTab member={member} isValid={isValid} />}
          {activeTab === 'events' && <EventsTab events={events} />}
          {activeTab === 'map' && <MapTab restaurants={restaurants} />}
        </div>
      </div>

      {/* 하단 탭 */}
      <div
        className="bg-white border-t border-gray-100 flex flex-shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {[
          { key: 'qr', label: 'MY', icon: QrCode },
          { key: 'events', label: 'EVENTS', icon: Calendar },
          { key: 'map', label: 'SPOT', icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={
                'flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ' +
                (activeTab === tab.key ? 'text-orange-500' : 'text-gray-400')
              }
            >
              <Icon size={20} weight={activeTab === tab.key ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Membership Card with Flip Animation & Lazy Camera ──────────────────────
function MembershipCard({ member, isValid, onQRScanned }) {
  const [flipped, setFlipped] = useState(false)

  const W = 'calc(100vw - 32px)'
  const cardW = W
  const cardH = `calc(${W} * 1.586)`

  const fs = {
    // still used for guide text in QRTab, left here for consistency if needed later
    label: `calc(${W} * 0.045)`,
    number: `calc(${W} * 0.075)`,
    valid: `calc(${W} * 0.038)`,
    name: `calc(${W} * 0.052)`,
    logo: `calc(${W} * 0.26)`,
  }

  // ── NON-VALID MEMBERSHIP: keep dotted-outline design as before ─────────────
  if (!isValid) {
    return (
      <div
        style={{
          width: cardW,
          height: cardH,
          margin: '0 auto',
          flexShrink: 0,
          borderRadius: '16px',
          border: '2px dashed #d4d4d8',
          background: '#f9fafb',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          textAlign: 'center',
          padding: '16px',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          UvA-IN MEMBERSHIP
        </span>
        <span
          style={{
            marginTop: '8px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          활성화된 멤버십이 없습니다
        </span>
        {member?.first_name && (
          <span
            style={{
              marginTop: '4px',
              fontSize: '13px',
              color: '#a1a1aa',
            }}
          >
            {member.first_name} {member.last_name}
          </span>
        )}
        <span
          style={{
            marginTop: '10px',
            fontSize: '11px',
            color: '#b0b0b8',
          }}
        >
          멤버십 갱신은 운영진에게 문의해주세요
        </span>
      </div>
    )
  }

  // ── VALID MEMBERSHIP: new minimal white front + same camera back ───────────
  const handleToggle = () => {
    setFlipped((f) => !f)
  }

  return (
    <div
      style={{
        width: cardW,
        height: cardH,
        margin: '0 auto',
        perspective: '1200px',
        flexShrink: 0,
        cursor: 'pointer',
      }}
      onClick={handleToggle}
    >
      {/* Flip container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT SIDE (NEW: white, portrait, no rotation, no member details) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              padding: '12px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                boxShadow: '0 14px 35px rgba(15,23,42,0.09)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#111827',
                  }}
                >
                  탭해서 Check-IN 하기
                </p>
                <p
                  style={{
                    marginTop: 6,
                    fontSize: '12px',
                    color: '#6b7280',
                  }}
                >
                  뒤집으면 카메라가 열립니다
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BACK SIDE (scanner) — unchanged */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              margin: '0 auto',
              position: 'relative',
              flexShrink: 0,
              background: '#000',
              border: '6px solid #f97316',
              borderRadius: '16px',
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Only mount scanner when flipped => permission asked after flip */}
              {flipped && <QRScanner onScan={onQRScanned} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── QR Tab ───────────────────────────────────────────────────────────────────
function QRTab({ member, isValid }) {
  const navigate = useNavigate()

  // Slide-up card behaviour (used only when isValid === true)
  const [lifted, setLifted] = useState(false)
  const cardLayerRef = useRef(null)
  const activityRef = useRef(null)
  const touchStartY = useRef(null)
  const currentOffset = useRef(0)
  const liftedRef = useRef(false)

  // Check-in state – used only when isValid === true
  const [state, setState] = useState('scanning') // 'scanning' | 'loading' | 'success' | 'error'
  const [storeName, setStoreName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [checkinMember, setCheckinMember] = useState(null)
  const [scanTime, setScanTime] = useState(null)
  const handlingRef = useRef(false)

  const getMaxLift = () => activityRef.current?.offsetHeight ?? 260

  const setTranslate = (offset) => {
    if (cardLayerRef.current) {
      cardLayerRef.current.style.transform = `translateY(${-offset}px)`
    }
  }

  const handleTouchStart = (e) => {
    if (cardLayerRef.current) {
      cardLayerRef.current.style.transition = 'none'
    }
    touchStartY.current = e.touches[0].clientY
    currentOffset.current = liftedRef.current ? getMaxLift() : 0
  }

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return
    const dy = touchStartY.current - e.touches[0].clientY
    const raw = currentOffset.current + dy
    const clamped = Math.max(0, Math.min(raw, getMaxLift()))
    setTranslate(clamped)
  }

  const handleTouchEnd = (e) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY
    const raw = currentOffset.current + dy
    const max = getMaxLift()
    const shouldLift = raw > max * 0.3

    if (cardLayerRef.current) {
      cardLayerRef.current.style.transition =
        'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
    }

    setTranslate(shouldLift ? max : 0)
    liftedRef.current = shouldLift
    setLifted(shouldLift)
    touchStartY.current = null
  }

  useEffect(() => {
    if (cardLayerRef.current) {
      cardLayerRef.current.style.transition =
        'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
    }
    setTranslate(lifted ? getMaxLift() : 0)
  }, [lifted])

  // Helpers
  const formatScanTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}`
  }

  const formatMembershipDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const fullName = checkinMember
    ? `${checkinMember.first_name || ''} ${checkinMember.last_name || ''}`.trim()
    : ''

  const reset = () => {
    setState('scanning')
    setStoreName('')
    setErrorMsg('')
    setCheckinMember(null)
    setScanTime(null)
  }

  const handleQRScanned = async (rawValue) => {
    if (handlingRef.current) return
    handlingRef.current = true

    setErrorMsg('')
    let storeId = null

    try {
      const url = new URL(rawValue)
      storeId = url.searchParams.get('store_id')
    } catch {
      if (rawValue.startsWith('store:')) {
        storeId = rawValue.replace('store:', '')
      }
    }

    if (!storeId) {
      setState('error')
      setErrorMsg('유효하지 않은 QR 코드입니다. 매장 QR을 스캔해주세요.')
      handlingRef.current = false
      return
    }

    setState('loading')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setState('error')
        setErrorMsg('로그인이 필요합니다.')
        handlingRef.current = false
        return
      }

      const { data: memberRow, error: memberError } = await supabase
        .from('members')
        .select('first_name, last_name, student_number, "University", membership_valid_until')
        .eq('user_id', user.id)
        .single()

      if (memberError) {
        console.warn('members fetch error:', memberError)
      }

      const result = await logRedemption({ storeId })

      if (result.success) {
        setStoreName(result.storeName || '매장')
        setCheckinMember(memberRow || null)
        setScanTime(new Date())
        setState('success')
      } else {
        setState('error')
        setErrorMsg(
          result.message || 'Check-In을 기록할 수 없습니다. 다시 시도해주세요.'
        )
      }
    } catch (err) {
      console.error('handleQRScanned error:', err)
      setState('error')
      setErrorMsg('오류가 발생했습니다: ' + (err?.message || '알 수 없는 오류'))
    }

    handlingRef.current = false
  }

  const W = 'calc(100vw - 32px)'
  const fs = {
    guide: `calc(${W} * 0.032)`,
  }

  // ── NON-VALID MEMBERSHIP ──────────────────────────────────────────────────
  if (!isValid) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-6">
        <MembershipCard member={member} isValid={false} />
      </div>
    )
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 gap-4">
        <div className="flex flex-col items-center gap-4 mt-20">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">멤버십 확인 중...</p>
        </div>
      </div>
    )
  }

  // ── SUCCESS ───────────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 gap-4 relative">
        <>
          <style>{`
            @keyframes recordingDot {
              0% { opacity: 1; }
              50% { opacity: 1; }
              50.1% { opacity: 0; }
              100% { opacity: 0; }
            }
          `}</style>
          <div
            className="absolute"
            style={{ top: 4, left: 16, zIndex: 10 }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: 9999,
                backgroundColor: '#f97316',
                animation: 'recordingDot 1s step-start infinite',
              }}
            />
          </div>
        </>

        <div className="flex flex-col items-center gap-4 mt-10 text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-4xl">✓</span>
          </div>
          <h2 className="font-bold text-gray-900 text-xl">Check-In 완료!</h2>
          <p className="text-gray-500 text-sm">
            <strong>{storeName}</strong>에서의 Check-In이 기록되었습니다
          </p>
          <p className="text-base font-bold text-orange-500">
            이 화면을 직원에게 보여주세요
          </p>

          <div className="w-full mt-4 p-4 bg-white rounded-2xl border-2 border-orange-500 shadow-sm text-left space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">Scan Time</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatScanTime(scanTime)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">Full Name</span>
              <span className="text-sm font-semibold text-gray-900">
                {fullName || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">Student ID</span>
              <span className="text-sm font-semibold text-gray-900">
                {checkinMember?.student_number || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">University</span>
              <span className="text-sm font-semibold text-gray-900">
                {checkinMember?.University || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500">
                Membership Valid Until
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatMembershipDate(checkinMember?.membership_valid_until)}
              </span>
            </div>
          </div>

          <div className="w-full mt-8">
            <button
              onClick={() => {
                reset()
                navigate('/member')
              }}
              className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-200 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 gap-4">
        <div className="flex flex-col items-center gap-4 mt-10 text-center max-w-xs">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-500 text-4xl">✕</span>
          </div>
          <h2 className="font-bold text-gray-900 text-xl">Check-In 실패</h2>
          <p className="text-gray-500 text-sm">{errorMsg}</p>
          <button
            onClick={reset}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-2xl text-sm hover:bg-orange-600 transition-colors"
          >
            다시 시도하기
          </button>
          <button
            onClick={() => navigate('/member')}
            className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-200 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // ── SCANNING (valid membership: card + swipe + guide text) ────────────────
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Activity stats (behind card layer at the bottom) */}
      <div
        ref={activityRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 16px 16px',
          zIndex: 1,
        }}
      >
        {isValid && <ActivityStatsCard userId={member?.user_id} />}
      </div>

      {/* Card layer (swipeable) */}
      <div
        ref={cardLayerRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: '100vh',
          marginTop: '-100vh',
          backgroundColor: 'var(--background, #ffffff)',
          padding: '16px 16px 24px',
          paddingTop: 'calc(100vh)',
          zIndex: 10,
          touchAction: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Spacer so card sits vertically centered */}
        <div style={{ flex: 1 }} />

        <MembershipCard
          member={member}
          isValid={isValid}
          onQRScanned={handleQRScanned}
        />

        {/* Guide text (only visible when not lifted) */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            marginTop: '10px',
            gap: '2px',
            paddingRight: '4px',
            opacity: lifted ? 0 : 1,
            transition: 'opacity 0.25s ease',
          }}
        >
          <span
            style={{
              fontSize: fs.guide,
              color: 'rgba(0,0,0,0.4)',
              fontWeight: 500,
            }}
          >
            눌러서 Check-IN 하기
          </span>
          <span
            style={{
              fontSize: fs.guide,
              color: 'rgba(0,0,0,0.4)',
              fontWeight: 500,
            }}
          >
            위로 올려서 이번 달 활동 보기
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Nav Button ───────────────────────────────────────────────────────────────

function NavBtn({ onClick, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(30,30,30,0.7)',
        border: 'none',
        color: '#fff',
        borderRadius: '999px',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        lineHeight: 1,
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        transition: 'background 0.15s',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'rgba(30,30,30,0.92)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'rgba(30,30,30,0.7)')
      }
    >
      {children}
    </button>
  )
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({ events }) {
  const [expandedId, setExpandedId] = useState(null)
  const [slideIndexes, setSlideIndexes] = useState({})
  const [pastEventsExpanded, setPastEventsExpanded] = useState(false)

  const setSlide = (eventId, idx) =>
    setSlideIndexes((prev) => ({ ...prev, [eventId]: idx }))

  useEffect(() => {
    if (!expandedId) return
    const ev = events.find((e) => e.id === expandedId)
    if (!ev) return
    const imgs = ev['image_urls'] || []
    if (imgs.length <= 1) return

    const handler = (e) => {
      if (e.key === 'ArrowRight') {
        setSlide(
          expandedId,
          Math.min((slideIndexes[expandedId] || 0) + 1, imgs.length - 1),
        )
      } else if (e.key === 'ArrowLeft') {
        setSlide(
          expandedId,
          Math.max((slideIndexes[expandedId] || 0) - 1, 0),
        )
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expandedId, slideIndexes, events])

  const addToCalendar = (ev) => {
    const start = new Date(ev.event_date)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const pad = (n) => String(n).padStart(2, '0')
    const fmt = (d) =>
      d.getUTCFullYear() +
      '' +
      pad(d.getUTCMonth() + 1) +
      '' +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      '' +
      pad(d.getUTCMinutes()) +
      '00Z'

    const ics =
      'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:' +
      fmt(start) +
      '\nDTEND:' +
      fmt(end) +
      '\nSUMMARY:' +
      ev.title +
      '\nLOCATION:' +
      (ev.location || '') +
      '\nDESCRIPTION:' +
      (ev.description || '') +
      '\nEND:VEVENT\nEND:VCALENDAR'

    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = ev.title + '.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderEvent = (ev) => {
    const isExpanded = expandedId === ev.id
    const imgs = ev['image_urls'] || []
    const instaUrl = ev['instagram_url']
    const currentSlide = slideIndexes[ev.id] || 0

    return (
      <div
        key={ev.id}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <button
          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
          className="w-full text-left p-5"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">{ev.title}</p>
            <span className="text-gray-400 text-sm ml-2">
              {isExpanded ? '▲' : '▼'}
            </span>
          </div>
          {ev.event_date && (
            <div className="flex items-center gap-1.5 text-sm text-orange-500 mt-1">
              <Calendar size={14} weight="fill" />
              <span>
                {new Date(ev.event_date).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          )}
          {ev.location && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
              <MapPin size={14} weight="fill" />
              <span>{ev.location}</span>
            </div>
          )}
        </button>

        {isExpanded && (
          <div>
            {imgs.length > 0 && (
              <div className="px-4">
                {/* Mobile swiper */}
                <div
                  className="md:hidden"
                  onTouchStart={(e) => {
                    e.currentTarget._swipeStartX = e.touches[0].clientX
                  }}
                  onTouchEnd={(e) => {
                    const start = e.currentTarget._swipeStartX
                    if (start == null) return
                    const dx = e.changedTouches[0].clientX - start
                    e.currentTarget._swipeStartX = null
                    if (dx < -40 && currentSlide < imgs.length - 1)
                      setSlide(ev.id, currentSlide + 1)
                    else if (dx > 40 && currentSlide > 0)
                      setSlide(ev.id, currentSlide - 1)
                  }}
                >
                  <div
                    className="relative rounded-2xl overflow-hidden bg-gray-100"
                    style={{ aspectRatio: '1/1' }}
                  >
                    <div
                      className="flex h-full"
                      style={{
                        transform: 'translateX(-' + currentSlide * 100 + '%)',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      {imgs.map((url, i) => (
                        <div
                          key={i}
                          className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={'이미지 ' + (i + 1)}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                            draggable={false}
                          />
                        </div>
                      ))}
                    </div>
                    {imgs.length > 1 && (
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                        {imgs.map((_, i) => (
                          <div
                            key={i}
                            onClick={() => setSlide(ev.id, i)}
                            className={
                              'rounded-full cursor-pointer transition-all ' +
                              (i === currentSlide
                                ? 'bg-white w-2 h-2'
                                : 'bg-white bg-opacity-50 w-1.5 h-1.5')
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop controls */}
                <div className="hidden md:block">
                  <div
                    className="relative rounded-2xl overflow-hidden bg-gray-100"
                    style={{ aspectRatio: '1/1' }}
                  >
                    <div
                      className="flex h-full"
                      style={{
                        transform: 'translateX(-' + currentSlide * 100 + '%)',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      {imgs.map((url, i) => (
                        <div
                          key={i}
                          className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={'이미지 ' + (i + 1)}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                            draggable={false}
                          />
                        </div>
                      ))}
                    </div>

                    {imgs.length > 1 && (
                      <>
                        {currentSlide > 0 && (
                          <NavBtn
                            onClick={() =>
                              setSlide(ev.id, currentSlide - 1)
                            }
                            style={{
                              position: 'absolute',
                              left: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                          >
                            ‹
                          </NavBtn>
                        )}
                        {currentSlide < imgs.length - 1 && (
                          <NavBtn
                            onClick={() =>
                              setSlide(ev.id, currentSlide + 1)
                            }
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                          >
                            ›
                          </NavBtn>
                        )}
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                          {imgs.map((_, i) => (
                            <div
                              key={i}
                              onClick={() => setSlide(ev.id, i)}
                              className={
                                'rounded-full cursor-pointer transition-all ' +
                                (i === currentSlide
                                  ? 'bg-white w-2 h-2'
                                  : 'bg-white bg-opacity-50 w-1.5 h-1.5')
                              }
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="px-5 pb-5">
              {ev.description && (
                <RichText
                  text={ev.description}
                  className="text-sm text-gray-600 mt-3 leading-relaxed block"
                />
              )}
              <div className="flex gap-2 mt-3">
                {ev.event_date && (
                  <button
                    onClick={() => addToCalendar(ev)}
                    className="flex-1 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1.5"
                  >
                    <Calendar size={14} weight="fill" />
                    캘린더에 추가
                  </button>
                )}
                {instaUrl && (
                  <a
                    href={instaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" />
                    </svg>
                    Instagram 에서 열기
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const now = new Date()
  const upcomingEvents = events.filter(
    (ev) => ev.event_date && new Date(ev.event_date) >= now,
  )
  const pastEvents = events.filter(
    (ev) => ev.event_date && new Date(ev.event_date) < now,
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-md mx-auto">
        <h2 className="font-semibold text-gray-900 mb-4">EVENTS</h2>
        {events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-2xl mb-2">📅</p>
            <p className="text-gray-500 text-sm">예정된 이벤트가 없어요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.length > 0 && (
              <div>
                {(() => {
                  let currentMonth = null
                  const blocks = []
                  upcomingEvents.forEach((ev) => {
                    const label = ev.event_date
                      ? `${new Date(ev.event_date).getMonth() + 1}월`
                      : '날짜 미정'
                    if (label !== currentMonth) {
                      currentMonth = label
                      blocks.push(
                        <p
                          key={`month-${label}`}
                          className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2"
                        >
                          {label}
                        </p>,
                      )
                    }
                    blocks.push(renderEvent(ev))
                  })
                  return blocks
                })()}
              </div>
            )}

            {pastEvents.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() =>
                    setPastEventsExpanded(!pastEventsExpanded)
                  }
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-semibold">
                      지난 이벤트
                    </span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium">
                      {pastEvents.length}
                    </span>
                  </div>
                  <span className="text-gray-400 text-lg">
                    {pastEventsExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {pastEventsExpanded && (
                  <div className="space-y-3 mt-3">
                    {(() => {
                      let currentMonth = null
                      const blocks = []
                      pastEvents.forEach((ev) => {
                        const label = ev.event_date
                          ? `${new Date(ev.event_date).getMonth() + 1}월`
                          : '날짜 미정'
                        if (label !== currentMonth) {
                          currentMonth = label
                          blocks.push(
                            <p
                              key={`past-month-${label}`}
                              className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2"
                            >
                              {label}
                            </p>,
                          )
                        }
                        blocks.push(renderEvent(ev))
                      })
                      return blocks
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
// ─── Map Tab ──────────────────────────────────────────────────────────────────

function MapTab({ restaurants }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState('전체')

  const filtered = useMemo(
    () =>
      activeCategory === '전체'
        ? restaurants
        : restaurants.filter((r) => r.category === activeCategory),
    [restaurants, activeCategory],
  )

  return (
    <div className="h-full flex flex-col">
      {/* 카테고리 바 */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
        {MAP_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat
          const iconSvg = isActive
            ? CATEGORY_ICONS_WHITE[cat]
            : CATEGORY_ICONS_ORANGE[cat]
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat)
                setSelected(null)
              }}
              className={
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ' +
                (isActive
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                dangerouslySetInnerHTML={{ __html: iconSvg }}
              />
              {cat}
            </button>
          )
        })}
      </div>

      {/* 지도 */}
      <div className="flex-1 relative overflow-hidden">
        <MapView
          restaurants={filtered}
          selected={selected}
          onSelect={setSelected}
        />
        {selected && (
          <SpotCard selected={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  )
}