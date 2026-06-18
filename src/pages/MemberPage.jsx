import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MapView from '../components/MapView'
import { SpotCard, RichText } from '../components/SpotCard'
import { MAP_CATEGORIES, CATEGORY_ICONS_WHITE, CATEGORY_ICONS_ORANGE } from '../lib/mapCategories'
import { QrCode, Calendar, MapPin, Gear, UserCircle, ArrowsVertical } from '@phosphor-icons/react'
import { useReviewPrompt } from '../hooks/useReviewPrompt'
import ReviewModal from '../components/ReviewModal'
import ActivityStatsCard from '../components/ActivityStatsCard'
import QRScanner from '../components/QRScanner'
import { logRedemption } from '../lib/redemption'


export default function MemberPage() {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('qr')
  const [tabKey, setTabKey] = useState(0)
  const [events, setEvents] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [qrCardLifted, setQrCardLifted] = useState(false)

  const navigate = useNavigate()

  // ── Review prompt hook ───────────────────────────────────────────────────────
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

  // ── Load user, member, events, restaurants ──────────────────────────────────
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

      // Members: maybeSingle() so we don't get a 406 if the admin has no row
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberError) {
        console.warn(
          'members error (can be normal if no row):',
          memberError.message,
        )
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

  // Prevent iOS edge-swipe back gesture
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
    if (key !== 'qr') {
      setQrCardLifted(false)
    }
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
      className="relative flex flex-col bg-white overflow-hidden"
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

      {/* Header: only on EVENTS tab */}
      {activeTab === 'events' && (
        <div
          className="bg-white px-4 py-2 flex items-center justify-between flex-shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
        >
          <div className="w-[60px]" />
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
      )}

      {/* Floating settings button for MY tab (no header) */}
      {activeTab === 'qr' && (
        <button
          onClick={() => navigate('/settings')}
          className={
            'absolute right-4 rounded-full bg-white p-2 text-gray-500 transition-opacity duration-200 ' +
            (qrCardLifted ? 'opacity-0 pointer-events-none' : 'opacity-100')
          }
          style={{
            top: 'calc(env(safe-area-inset-top) + 8px)',
            zIndex: 20, // above card layer
          }}
          aria-label="Settings"
        >
          <Gear size={20} weight="bold" />
        </button>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div key={tabKey} className="h-full">
          {activeTab === 'qr' && (
            <QRTab
              member={member}
              isValid={isValid}
              onLiftChange={(lifted) => setQrCardLifted(lifted)}
            />
          )}
          {activeTab === 'events' && <EventsTab events={events} />}
          {activeTab === 'map' && <MapTab restaurants={restaurants} />}
        </div>
      </div>

      {/* Bottom tab bar */}
      <div
        className="bg-white flex flex-shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {[
          { key: 'qr', label: 'MY', icon: QrCode },
          { key: 'events', label: 'EVENTS', icon: Calendar },
          { key: 'map', label: 'SPOT', icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={
                'flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ' +
                (active ? 'text-orange-500' : 'text-gray-400')
              }
            >
              <Icon size={20} weight={active ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Pastel avatar colors ─────────────────────────────────────────────────────

const PASTEL_COLORS = [
  '#FFB3B3',
  '#FFD9A0',
  '#FFF3A0',
  '#B3F0C2',
  '#A8D8FF',
  '#C5B3FF',
  '#FFB3E6',
  '#B3F0EE',
]

function getPastelColor(seed) {
  const str = seed || 'default'
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length]
}

// ─── Membership Card ─────────────────────────────────────────────────────────
function MembershipCard({
  member,
  isValid,
  onQRScanned,
  disabled = false,
  onFlipChange,
}) {
  const [flipped, setFlipped] = useState(false)

  const W = 'calc(100vw - 32px)'
  const cardW = W
  const cardH = `calc(${W} * 1.586)`
  const fs = {
    brand:    `calc(${W} * 0.038)`,
    valid:    `calc(${W} * 0.032)`,
    name:     `calc(${W} * 0.052)`,
    wordmark: `calc(${W} * 0.18)`,
  }

  const avatarSeed      = `${member?.first_name || ''}${member?.last_name || ''}`
  const pastelBg        = getPastelColor(avatarSeed)
  const avatarSize      = `calc(${W} * 0.19)`
  const hasProfileImage = !!member?.profile_image_url
  const qrOutlineSize   = `calc((${W} - 48px) * 0.6875)`
  const BRACKET = 24

  useEffect(() => {
    if (onFlipChange) onFlipChange(flipped)
  }, [flipped, onFlipChange])

  const cardFront = (
    <div
      style={{
        width: '100%', height: '100%', borderRadius: '16px',
        background: '#F6F4F1', border: '1px solid #d6d3c0',
        boxShadow: '0 14px 35px rgba(15,23,42,0.09)',
        padding: `calc(${W} * 0.07)`, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      {/* TOP */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', background: hasProfileImage ? 'transparent' : pastelBg, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
          {hasProfileImage ? (
            <img src={member.profile_image_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <UserCircle size="72%" weight="fill" color="rgba(44,42,39,0.55)" />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: `calc(${W} * 0.01)`, textAlign: 'right' }}>
          <span style={{ fontFamily: '"Handjet", system-ui, sans-serif', fontSize: fs.brand, fontWeight: 700, color: '#2C2A27', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            UvA-IN Membership
          </span>
          <span style={{ fontFamily: '"Handjet", system-ui, sans-serif', fontSize: fs.valid, fontWeight: 500, color: '#6b6a5e', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: `calc(${W} * 0.012)` }}>
            Valid Until{' '}
            {member?.membership_valid_until ? new Date(member.membership_valid_until).toLocaleDateString('en-CA') : 'N/A'}
          </span>
          <span style={{ fontFamily: '"Handjet", system-ui, sans-serif', fontSize: fs.name, fontWeight: 800, color: '#f97316', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: `calc(${W} * 0.008)` }}>
            {member?.first_name} {member?.last_name}
          </span>
        </div>
      </div>

      {/* MIDDLE */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: qrOutlineSize, height: qrOutlineSize, flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 0, left: 0, width: BRACKET, height: BRACKET, borderTop: '2.5px solid rgba(44,42,39,0.3)', borderLeft: '2.5px solid rgba(44,42,39,0.3)', borderRadius: '4px 0 0 0' }} />
          <span style={{ position: 'absolute', top: 0, right: 0, width: BRACKET, height: BRACKET, borderTop: '2.5px solid rgba(44,42,39,0.3)', borderRight: '2.5px solid rgba(44,42,39,0.3)', borderRadius: '0 4px 0 0' }} />
          <span style={{ position: 'absolute', bottom: 0, left: 0, width: BRACKET, height: BRACKET, borderBottom: '2.5px solid rgba(44,42,39,0.3)', borderLeft: '2.5px solid rgba(44,42,39,0.3)', borderRadius: '0 0 0 4px' }} />
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: BRACKET, height: BRACKET, borderBottom: '2.5px solid rgba(44,42,39,0.3)', borderRight: '2.5px solid rgba(44,42,39,0.3)', borderRadius: '0 0 4px 0' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `calc(${W} * 0.02)` }}>
            <QrCode size={`calc(${W} * 0.1)`} weight="bold" color="rgba(44,42,39,0.25)" />
            <span style={{ fontFamily: '"Handjet", system-ui, sans-serif', fontSize: `calc(${W} * 0.034)`, fontWeight: 600, color: 'rgba(44,42,39,0.4)', letterSpacing: '0.05em' }}>
              탭 해서 Check-IN 하기
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontFamily: '"Alien Block", "Arial Black", Impact, sans-serif', fontSize: fs.wordmark, fontWeight: 900, color: '#2C2A27', letterSpacing: '-0.01em', lineHeight: 1, textTransform: 'uppercase' }}>
          UvA-IN
        </span>
      </div>
    </div>
  )

  if (!isValid) {
    return (
      <div style={{ width: cardW, height: cardH, margin: '0 auto', flexShrink: 0, borderRadius: '16px', border: '2px dashed #cbd5b1', background: '#F6F4F1', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#4b5563', textAlign: 'center', padding: '16px', fontFamily: '"Handjet", system-ui, sans-serif' }}>
        <span style={{ fontSize: fs.brand, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: '"Alien Block", system-ui, sans-serif', color: '#2C2A27' }}>
          UvA-IN MEMBERSHIP
        </span>
        <span style={{ marginTop: '8px', fontSize: fs.valid, fontWeight: 500 }}>활성화된 멤버십이 없습니다</span>
        {member?.first_name && (
          <span style={{ marginTop: '4px', fontSize: fs.valid, color: '#6b7280' }}>{member.first_name} {member.last_name}</span>
        )}
        <span style={{ marginTop: '10px', fontSize: `calc(${W} * 0.028)`, color: '#9ca3af' }}>멤버십 갱신은 임원에게 문의해주세요</span>
      </div>
    )
  }

  return (
    <div
      style={{ width: cardW, height: cardH, margin: '0 auto', perspective: '1200px', flexShrink: 0, cursor: disabled ? 'default' : 'pointer' }}
      onClick={() => { if (disabled || !isValid) return; setFlipped((f) => !f) }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

        {/* ── Brushed-metal frame + integrated top tab ── */}
        <svg
          style={{
            position: 'absolute',
            inset: '-3px',
            width: 'calc(100% + 6px)',
            height: 'calc(100% + 6px)',
            overflow: 'visible',
            zIndex: 0,
            pointerEvents: 'none',
          }}
          viewBox="0 0 106 174.1"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#c8c4bc" />
              <stop offset="50%"  stopColor="#dedad4" />
              <stop offset="100%" stopColor="#c0bcb4" />
            </linearGradient>

            <clipPath id="bottomGap">
              <rect x="0"  y="0"   width="106" height="158" />
              <rect x="0"  y="158" width="28" height="20" />
<rect x="78" y="158" width="28" height="20" />
            </clipPath>

            {/*
              Tab: wide (x=25→81), very flat (only 5 units tall: y=-2 to y=3)
              Top corners softly rounded, bottom corners sharp/flush at y=3
              Pill hole: thin (h=1.8) and narrow (w=20), centered at x=43→63
            */}
            <mask id="tabHoleMask">
              <path
                d="M28,3 L78,3 L78,0 Q78,-2 76,-2 L30,-2 Q28,-2 28,0 Z"
                fill="white"
              />
              <rect x="43" y="0.8"  width="20" height="1.8" rx="0.9" ry="0.9" fill="black" />
            </mask>
          </defs>

          {/* Card frame */}
          <rect
            x="3" y="3" width="100" height="168.1"
            rx="14.5" ry="9.2"
            fill="none"
            stroke="url(#metalGrad)"
            strokeWidth="6"
            clipPath="url(#bottomGap)"
          />

          {/* Tab — bottom flush at y=3, very flat profile */}
          <path
            d="M28,3 L78,3 L78,0 Q78,-2 76,-2 L30,-2 Q28,-2 28,0 Z"
            fill="url(#metalGrad)"
            mask="url(#tabHoleMask)"
          />
        </svg>

        {/* ── Front face ── */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', padding: '12px', boxSizing: 'border-box', zIndex: 1 }}>
          {cardFront}
        </div>

        {/* ── Back face (camera) ── */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', padding: '12px', boxSizing: 'border-box', zIndex: 1 }}>
          <div style={{ width: '100%', height: '100%', background: '#F6F4F1', border: '1px solid #d6d3c0', borderRadius: '16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {flipped && <QRScanner onScan={onQRScanned} />}
          </div>
        </div>

        {/* ── Left grip ── */}
        <div style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '300px', zIndex: 2, pointerEvents: 'none', borderRadius: '0 5px 5px 0', background: '#ccc9c1' }} />

        {/* ── Right grip ── */}
        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '300px', zIndex: 2, pointerEvents: 'none', borderRadius: '5px 0 0 5px', background: '#ccc9c1' }} />

      </div>
    </div>
  )
}

// ─── QR Tab ───────────────────────────────────────────────────────────────────

function QRTab({ member, isValid, onLiftChange }) {
  const navigate = useNavigate()
  const [lifted, setLifted] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)

  const cardLayerRef = useRef(null)
  const activityRef = useRef(null)
  const touchStartY = useRef(null)
  const liftedRef = useRef(false)

  const [state, setState] = useState('scanning')
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
    if (cardFlipped) return
    touchStartY.current = e.touches[0].clientY
    if (cardLayerRef.current) {
      cardLayerRef.current.style.transition = 'none'
    }
  }

  const handleTouchMove = (e) => {
    if (cardFlipped) return
    if (touchStartY.current == null) return
    const dy = touchStartY.current - e.touches[0].clientY
    // Prevent scroll when clearly vertical swipe
    if (Math.abs(dy) > 10) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e) => {
    if (cardFlipped) return
    if (touchStartY.current == null) return

    const dy = touchStartY.current - e.changedTouches[0].clientY
    const max = getMaxLift()
    const SWIPE_THRESHOLD = 40

    let nextLifted = liftedRef.current

    // swipe up → lift
    if (dy > SWIPE_THRESHOLD) {
      nextLifted = true
    }
    // swipe down → lower
    else if (dy < -SWIPE_THRESHOLD) {
      nextLifted = false
    }

    if (cardLayerRef.current) {
      cardLayerRef.current.style.transition =
        'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
    }
    setTranslate(nextLifted ? max : 0)
    liftedRef.current = nextLifted
    setLifted(nextLifted)
    touchStartY.current = null
  }

  // Sync lifted state with DOM and parent
  useEffect(() => {
    if (cardLayerRef.current) {
      cardLayerRef.current.style.transition =
        'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
    }
    setTranslate(lifted ? getMaxLift() : 0)
    if (onLiftChange) onLiftChange(lifted)
  }, [lifted, onLiftChange])

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
    ? `${checkinMember.first_name || ''} ${
        checkinMember.last_name || ''
      }`.trim()
    : ''

  const reset = () => {
    setState('scanning')
    setStoreName('')
    setErrorMsg('')
    setCheckinMember(null)
    setScanTime(null)
    setLifted(false)
    liftedRef.current = false
    if (onLiftChange) onLiftChange(false)
  }

  const handleQRScanned = useCallback(async (rawValue) => {
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
        .select(
          'first_name, last_name, student_number, "University", membership_valid_until',
        )
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
          result.message ||
            'Check-In을 기록할 수 없습니다. 다시 시도해주세요.',
        )
      }
    } catch (err) {
      console.error('handleQRScanned error:', err)
      setState('error')
      setErrorMsg(
        '오류가 발생했습니다: ' + (err?.message || '알 수 없는 오류'),
      )
    }

    handlingRef.current = false
  }, []) // empty deps — uses only refs and stable setters

  const W = 'calc(100vw - 32px)'
  const fs = {
    guide: `calc(${W} * 0.032)`,
  }

  // ── Different states ────────────────────────────────────────────────────────

  if (!isValid) {
    if (onLiftChange) onLiftChange(false)
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-6">
        <MembershipCard member={member} isValid={false} />
      </div>
    )
  }

  if (state === 'loading') {
    if (onLiftChange) onLiftChange(false)
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 gap-4">
        <div className="flex flex-col items-center gap-4 mt-20">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">멤버십 확인 중...</p>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    if (onLiftChange) onLiftChange(false)
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
              <span className="text-xs font-medium text-gray-500">
                Scan Time
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatScanTime(scanTime)}
              </span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">
                Full Name
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {fullName || 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">
                Student ID
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {checkinMember?.student_number || 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">
                University
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {checkinMember?.University || 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500">
                Membership Valid Until
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatMembershipDate(
                  checkinMember?.membership_valid_until,
                )}
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

  if (state === 'error') {
    if (onLiftChange) onLiftChange(false)
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

  // ── SCANNING STATE ──────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 이번 달 활동 + long fade when lifted */}
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
        {isValid && (
          <div className="relative">
            <ActivityStatsCard userId={member?.user_id} />
          </div>
        )}
      </div>

      {/* Membership card layer */}
      <div
        ref={cardLayerRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          backgroundColor: '#ffffff',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '66px 16px 0',
        }}
      >
        <MembershipCard
          member={member}
          isValid={isValid}
          onQRScanned={handleQRScanned}
          disabled={lifted}
          onFlipChange={setCardFlipped}
        />

        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            paddingRight: '20px',
            paddingTop: '6px',
            gap: 4,
          }}
        >
          {!cardFlipped && (
            <span
              style={{
                fontSize: fs.guide,
                color: 'rgba(44,42,39,0.35)',
                fontWeight: 500,
                transition: 'color 0.25s ease',
              }}
            >
              {lifted
                ? '내려서 Check-IN 하기'
                : '위로 올려서 이번 달 활동 보기'}
            </span>
          )}
          {cardFlipped && (
            <span
              style={{
                fontSize: fs.guide,
                color: 'rgba(44,42,39,0.35)',
                fontWeight: 500,
              }}
            >
              탭 해서 뒤돌아가기
            </span>
          )}
        </div>
      </div>

      {/* Top fade – soften the safe-area/card line when lifted */}
      {lifted && (
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 24,
            background:
              'linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))',
            zIndex: 30,
          }}
        />
      )}
    </div>
  )
}

// ─── Nav Button (not currently used, but kept for future) ─────────────────────

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
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // ── Split & sort ────────────────────────────────────────────────────────────
  const datedEvents = events.filter((ev) => ev.event_date)

  const tbdEvents = events
    .filter((ev) => !ev.event_date)
    .sort((a, b) =>
      a.created_at && b.created_at
        ? new Date(a.created_at) - new Date(b.created_at)
        : 0,
    )

  const futureEvents = datedEvents
    .filter((ev) => new Date(ev.event_date) >= now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))

  const pastEvents = datedEvents
    .filter((ev) => new Date(ev.event_date) < now)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))

  const nextEvent = futureEvents[0] || null
  const otherUpcomingEvents = nextEvent ? futureEvents.slice(1) : futureEvents

  const allEvents = [...futureEvents, ...tbdEvents, ...pastEvents]
  const initialEvent = allEvents[0] || null

  const [selectedEvent, setSelectedEvent] = useState(initialEvent)
  const [previewEvent, setPreviewEvent] = useState(initialEvent)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [slideIndexes, setSlideIndexes] = useState({})
  const [pastEventsExpanded, setPastEventsExpanded] = useState(false)

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxClosing, setLightboxClosing] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lbSlideDir, setLbSlideDir] = useState(0) // -1 = next, 1 = prev

  const [imageAspectRatios, setImageAspectRatios] = useState({})
  const [frontPanelTextColor, setFrontPanelTextColor] = useState('#1f2937')

  const [calMonth, setCalMonth] = useState(() => {
    const base = initialEvent?.event_date
      ? new Date(initialEvent.event_date)
      : now
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const containerRef = useRef(null)

  useEffect(() => {
    if (!selectedEvent?.event_date) return
    const d = new Date(selectedEvent.event_date)
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [selectedEvent])

  const setSlide = (id, idx) =>
    setSlideIndexes((p) => ({
      ...p,
      [id]: idx,
    }))

  // ── Load image dimensions to detect aspect ratio ────────────────────────────
  useEffect(() => {
    const loadImageDimensions = (url) =>
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const ratio = img.width / img.height
          resolve(ratio)
        }
        img.onerror = () => resolve(1)
        img.src = url
      })

    const loadAllRatios = async () => {
      const ratios = {}
      for (const ev of events) {
        const imgs = ev.image_urls || []
        const evRatios = []
        for (const url of imgs) {
          const ratio = await loadImageDimensions(url)
          evRatios.push(ratio)
        }
        ratios[ev.id] = evRatios
      }
      setImageAspectRatios(ratios)
    }

    loadAllRatios()
  }, [events])

  const isPortrait = (aspectRatio) =>
    aspectRatio >= 0.75 && aspectRatio <= 0.85

  // ── Keyboard nav for image slider in expanded cards ─────────────────────────
  useEffect(() => {
    if (!expandedId) return
    const ev = events.find((e) => e.id === expandedId)
    if (!ev) return
    const imgs = ev.image_urls || []
    if (imgs.length <= 1) return

    const h = (e) => {
      if (e.key === 'ArrowRight') {
        setSlide(
          expandedId,
          Math.min((slideIndexes[expandedId] || 0) + 1, imgs.length - 1),
        )
      } else if (e.key === 'ArrowLeft') {
        setSlide(expandedId, Math.max((slideIndexes[expandedId] || 0) - 1, 0))
      }
    }

    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [expandedId, slideIndexes, events])

  // ── Lightbox keyboard nav ───────────────────────────────────────────────────
  useEffect(() => {
    if (!lightboxOpen) return
    const imgs = selectedEvent?.image_urls || []

    const h = (e) => {
      if (e.key === 'ArrowRight') {
        setLightboxIndex((i) => Math.min(i + 1, imgs.length - 1))
        setLbSlideDir(-1)
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => Math.max(i - 1, 0))
        setLbSlideDir(1)
      } else if (e.key === 'Escape') {
        startLightboxClose()
      }
    }

    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [lightboxOpen, selectedEvent])

  // ── Helper to open/close lightbox with simple fade ──────────────────────────
  const openLightboxAt = (index) => {
    setLightboxIndex(index)
    setLbSlideDir(0)
    setLightboxClosing(false)
    setLightboxOpen(true)
  }

  const startLightboxClose = () => {
    setLbSlideDir(0)
    setLightboxClosing(true)
    setTimeout(() => {
      setLightboxOpen(false)
      setLightboxClosing(false)
    }, 150)
  }

  // ── Vertical drag between events in header ───────────────────────────────────
  const dragStartY = useRef(null)
  const dragAccumulator = useRef(0)
  const lastIdxRef = useRef(null)

  const currentEventIndex = allEvents.findIndex(
    (ev) => ev.id === selectedEvent?.id,
  )

  const handleContainerTouchStart = (e) => {
    const touch = e.touches[0]
    const rect = containerRef.current?.getBoundingClientRect()
    // Avoid grabbing when finger starts too low (near calendar)
    if (rect && touch.clientY > rect.bottom - 60) return

    dragStartY.current = touch.clientY
    dragAccumulator.current = 0
    lastIdxRef.current = currentEventIndex
    setIsDragging(true)
    setPreviewEvent(selectedEvent)
  }

  const handleContainerTouchMove = (e) => {
    if (dragStartY.current == null) return
    const dy = dragStartY.current - e.touches[0].clientY
    dragAccumulator.current = dy

    const delta =
      dy > 0 ? Math.floor(dy / 60) : dy < 0 ? Math.ceil(dy / 60) : 0
    const idx = Math.max(
      0,
      Math.min((lastIdxRef.current ?? 0) + delta, allEvents.length - 1),
    )
    setPreviewEvent(allEvents[idx])
  }

  const handleContainerTouchEnd = () => {
    if (dragStartY.current == null) return

    const dy = dragAccumulator.current
    const delta =
      dy > 0 ? Math.floor(dy / 60) : dy < 0 ? Math.ceil(dy / 60) : 0

    if (delta !== 0) {
      const newIdx = Math.max(
        0,
        Math.min((currentEventIndex ?? 0) + delta, allEvents.length - 1),
      )
      if (newIdx !== currentEventIndex) {
        setSelectedEvent(allEvents[newIdx])
      }
    }

    dragStartY.current = null
    dragAccumulator.current = 0
    lastIdxRef.current = null
    setIsDragging(false)
    setPreviewEvent(selectedEvent)
  }

  // ── LIGHTBOX TOUCH HANDLERS ─────────────────────────────────────────────────
  const lbSwipeX = useRef(null)
  const lbSwipeY = useRef(null)

  const handleLbTouchStart = (e) => {
    lbSwipeX.current = e.touches[0].clientX
    lbSwipeY.current = e.touches[0].clientY
  }

  const handleLbTouchEnd = (e) => {
    if (lbSwipeX.current == null) return
    const dx = e.changedTouches[0].clientX - lbSwipeX.current
    const dy = e.changedTouches[0].clientY - lbSwipeY.current
    lbSwipeX.current = null
    lbSwipeY.current = null

    // Close on vertical swipe
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
      startLightboxClose()
      return
    }

    const imgs = selectedEvent?.image_urls || []
    if (dx < -40) {
      setLbSlideDir(-1)
      setLightboxIndex((i) => Math.min(i + 1, imgs.length - 1))
    } else if (dx > 40) {
      setLbSlideDir(1)
      setLightboxIndex((i) => Math.max(i - 1, 0))
    }
  }

  // ── Formatting helpers ──────────────────────────────────────────────────────
  const getDayDiff = (s) => {
    const d = new Date(s)
    return Math.round(
      (new Date(d.getFullYear(), d.getMonth(), d.getDate()) - todayStart) /
        86400000,
    )
  }

  const formatTopDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return {
      dayName: date
        .toLocaleDateString('en-US', { weekday: 'short' })
        .toUpperCase(),
      dateNum: `${String(date.getDate()).padStart(2, '0')}.${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}`,
      monthName: date
        .toLocaleDateString('en-US', { month: 'short' })
        .toUpperCase(),
    }
  }

  const formatTopTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    let h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`
  }

  const getEventStatus = (ev) => {
    if (!ev) return ''
    if (!ev.event_date) return 'TBD'

    const days = getDayDiff(ev.event_date)
    if (days < 0) return 'PAST'
    if (nextEvent && ev.id === nextEvent.id)
      return days === 0 ? 'TODAY' : `D-${days}`
    return 'UPCOMING'
  }

  const addToCalendar = (ev) => {
    if (!ev?.event_date) return
    const start = new Date(ev.event_date)
    const end = new Date(start.getTime() + 7200000)

    const pad = (n) => String(n).padStart(2, '0')
    const fmt = (d) =>
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      '00Z'

    const ics =
      `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n` +
      `DTSTART:${fmt(start)}\n` +
      `DTEND:${fmt(end)}\n` +
      `SUMMARY:${ev.title}\n` +
      `LOCATION:${ev.location || ''}\n` +
      `DESCRIPTION:${ev.description || ''}\n` +
      `END:VEVENT\nEND:VCALENDAR`

    const url = URL.createObjectURL(
      new Blob([ics], { type: 'text/calendar' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = (ev.title || 'event') + '.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const W = 'calc(100vw - 32px)'
  const fs = {
    day: `calc(${W} * 0.06)`,
    date: `calc(${W} * 0.24)`,
    month: `calc(${W} * 0.24)`,
  }

  const eventsByDate = {}
  datedEvents.forEach((ev) => {
    const key = ev.event_date.slice(0, 10)
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(ev)
  })

  const circleStyle = (ev) => {
    if (nextEvent && ev.id === nextEvent.id) {
      return { bg: '#f97316', color: '#fff' }
    }
    if (new Date(ev.event_date) >= now) {
      return { bg: '#1f2937', color: '#fff' }
    }
    return { bg: '#6b7280', color: '#fff' }
  }

  const calYear = calMonth.getFullYear()
  const calMonthIdx = calMonth.getMonth()
  const cells = [
    ...Array(new Date(calYear, calMonthIdx, 1).getDay()).fill(null),
    ...Array.from(
      { length: new Date(calYear, calMonthIdx + 1, 0).getDate() },
      (_, i) => i + 1,
    ),
  ]
  while (cells.length < 42) cells.push(null)

  const handleDayPress = (day) => {
    if (!day) return
    const key = `${calYear}-${String(calMonthIdx + 1).padStart(
      2,
      '0',
    )}-${String(day).padStart(2, '0')}`
    const dayEvents = eventsByDate[key]
    if (!dayEvents?.length) return
    setSelectedEvent(dayEvents[0])
  }

  const renderEvent = (ev) => {
    if (!ev) return null
    const isExpanded = expandedId === ev.id
    const imgs = ev.image_urls || []
    const instaUrl = ev.instagram_url
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
                <div
                  className="md:hidden"
                  onTouchStart={(e) => {
                    e.currentTarget._sx = e.touches[0].clientX
                  }}
                  onTouchEnd={(e) => {
                    const dx =
                      e.changedTouches[0].clientX - e.currentTarget._sx
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
                        transform: `translateX(-${currentSlide * 100}%)`,
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
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
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
                              'rounded-full cursor-pointer ' +
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
                    className="flex-1 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-1.5"
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
                    className="flex-1 text-xs bg-orange-500 text-white px-3 py-2 rounded-lg text-center flex items-center justify-center gap-1.5"
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

  // ── First-panel image + color logic ─────────────────────────────────────────
  const displayEvent = isDragging ? previewEvent : selectedEvent
  const displayImages = displayEvent?.image_urls || []
  const hasImages = displayImages.length > 0
  const displayImageRatios = imageAspectRatios[displayEvent?.id] || []

  const PAST_DATE_COLOR = '#4b5563'
  const DRAG_DATE_COLOR = '#9ca3af'

  const isPastSelected =
    !!displayEvent?.event_date &&
    new Date(displayEvent.event_date) < todayStart

  const baseDateColor = isPastSelected ? PAST_DATE_COLOR : '#1f2937'
  const effectiveDateColor = isDragging ? DRAG_DATE_COLOR : baseDateColor

  const getTextColorFromImage = (imageUrl) =>
    new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(
          Math.floor(img.width / 2),
          Math.floor(img.height / 2),
          1,
          1,
        )
        const [r, g, b] = imageData.data
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

        resolve(luminance > 0.5 ? '#111827' : '#ffffff')
      }
      img.onerror = () => resolve('#111827')
      img.src = imageUrl
    })

  useEffect(() => {
    let cancelled = false

    const update = async () => {
      if (displayImages.length > 0) {
        const color = await getTextColorFromImage(displayImages[0])
        if (!cancelled) setFrontPanelTextColor(color)
      } else {
        if (!cancelled) setFrontPanelTextColor('#111827')
      }
    }

    update()
    return () => {
      cancelled = true
    }
  }, [displayImages])

  return (
    <>
      <style>{`
        @keyframes lbFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lbFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .lb-open  { animation: lbFadeIn 0.15s ease-out; }
        .lb-close { animation: lbFadeOut 0.15s ease-in; }

        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .lb-slide-left  { animation: slideInFromRight 0.18s ease-out; }
        .lb-slide-right { animation: slideInFromLeft 0.18s ease-out; }
      `}</style>

      <div
        ref={containerRef}
        onTouchStart={handleContainerTouchStart}
        onTouchMove={handleContainerTouchMove}
        onTouchEnd={handleContainerTouchEnd}
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {/* TOP SECTION */}
        <div
          style={{
            flex: '0 0 auto',
            padding: '16px',
            paddingTop: '24px',
            backgroundColor: '#ffffff',
          }}
        >
          {displayEvent && (
            <div className="px-2 max-w-md mx-auto">
              {/* Day + Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  paddingRight: '4px',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Handjet", system-ui, sans-serif',
                    fontSize: fs.day,
                    fontWeight: 500,
                    color: '#9ca3af',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    lineHeight: 0.85,
                  }}
                >
                  {displayEvent.event_date
                    ? formatTopDate(displayEvent.event_date)?.dayName
                    : ''}
                </span>
                <span
                  style={{
                    fontFamily: '"Handjet", system-ui, sans-serif',
                    fontSize: fs.day,
                    fontWeight: 500,
                    color: '#9ca3af',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    lineHeight: 0.85,
                  }}
                >
                  {getEventStatus(displayEvent)}
                </span>
              </div>

              {/* Date + pile + front panel */}
              <div className="flex items-stretch mt-2">
                {/* Left: date */}
                {displayEvent.event_date && (() => {
                  const t = formatTopDate(displayEvent.event_date)
                  if (!t) return null
                  return (
                    <div
                      className="flex flex-col items-start justify-center"
                      style={{ flexShrink: 0 }}
                    >
                      <span
                        style={{
                          fontFamily: '"Handjet", system-ui, sans-serif',
                          fontSize: fs.date,
                          fontWeight: 800,
                          color: effectiveDateColor,
                          letterSpacing: '0.02em',
                          lineHeight: 0.85,
                        }}
                      >
                        {t.dateNum}
                      </span>
                      <span
                        style={{
                          fontFamily: '"Handjet", system-ui, sans-serif',
                          fontSize: fs.month,
                          fontWeight: 800,
                          color: effectiveDateColor,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          lineHeight: 0.85,
                          marginTop: '2px',
                        }}
                      >
                        {t.monthName}
                      </span>
                    </div>
                  )
                })()}

                {/* Right: image pile + front blur panel */}
                <div
                  className="flex-1"
                  onClick={() => hasImages && openLightboxAt(0)}
                  style={{
                    paddingLeft: displayEvent.event_date ? '16px' : '0',
                    paddingRight: '4px',
                    position: 'relative',
                    cursor: hasImages ? 'pointer' : 'default',
                  }}
                >
                  {/* Back card 2 — image[1] */}
                  {hasImages && displayImages.length >= 2 && (() => {
                    const ratio = displayImageRatios[1] || 1
                    const aspectRatio = isPortrait(ratio) ? '4/5' : '1/1'
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          aspectRatio,
                          borderRadius: '12px',
                          overflow: 'hidden',
                          backgroundColor: '#d1d5db',
                          transform: 'rotate(3deg) translate(7px, 7px)',
                          zIndex: 1,
                        }}
                      >
                        {displayImages[1] && (
                          <img
                            src={displayImages[1]}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            draggable={false}
                          />
                        )}
                      </div>
                    )
                  })()}

                  {/* Back card 1 — image[0] */}
                  {hasImages && (() => {
                    const ratio = displayImageRatios[0] || 1
                    const aspectRatio = isPortrait(ratio) ? '4/5' : '1/1'
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          aspectRatio,
                          borderRadius: '12px',
                          overflow: 'hidden',
                          backgroundColor: '#e5e7eb',
                          transform: 'rotate(1.5deg) translate(3.5px, 3.5px)',
                          zIndex: 2,
                        }}
                      >
                        {displayImages[0] && (
                          <img
                            src={displayImages[0]}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            draggable={false}
                          />
                        )}
                      </div>
                    )
                  })()}

                  {/* Front: semi-transparent Gaussian blur panel (always) */}
                  {(() => {
                    const ratio = hasImages ? displayImageRatios[0] || 1 : 1
                    const aspectRatio = isPortrait(ratio) ? '4/5' : '1/1'

                    return (
                      <div
                        style={{
                          position: 'relative',
                          zIndex: 3,
                          borderRadius: '12px',
                          overflow: 'hidden',
                          aspectRatio,
                          width: '100%',
                          backgroundColor: 'transparent',
                          border: 'none',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(255,255,255,0.35)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                          }}
                        />

                        <div
                          style={{
                            position: 'relative',
                            height: '100%',
                            padding: '12px 14px 28px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              fontFamily:
                                '"Noto Sans KR", system-ui, sans-serif',
                              fontSize: `calc(${W} * 0.052)`,
                              fontWeight: 700,
                              color:
                                nextEvent &&
                                displayEvent &&
                                displayEvent.id === nextEvent.id
                                  ? '#f97316' // most upcoming always orange
                                  : frontPanelTextColor,
                              lineHeight: 1.2,
                            }}
                          >
                            {displayEvent.title}
                          </span>

                          {displayEvent.event_date && (
                            <span
                              style={{
                                fontFamily:
                                  '"Handjet", system-ui, sans-serif',
                                fontSize: `calc(${W} * 0.042)`,
                                fontWeight: 700,
                                color: frontPanelTextColor,
                                letterSpacing: '0.04em',
                              }}
                            >
                              {formatTopTime(displayEvent.event_date)}
                            </span>
                          )}

                          {displayEvent.location && (
                            <span
                              style={{
                                fontFamily:
                                  '"Handjet", system-ui, sans-serif',
                                fontSize: `calc(${W} * 0.036)`,
                                fontWeight: 700,
                                color: frontPanelTextColor,
                                letterSpacing: '0.04em',
                              }}
                            >
                              {displayEvent.location}
                            </span>
                          )}
                        </div>

                        {/* Image count indicator – ALWAYS visible */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '10px',
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="white"
                          >
                            <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
                          </svg>
                          <span
                            style={{
                              fontFamily:
                                '"Handjet", system-ui, sans-serif',
                              fontSize: 12,
                              color: '#fff',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {displayImages.length}
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SCROLLABLE SECTION: calendar + lists */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div className="px-4 py-6 max-w-md mx-auto">
            {/* CALENDAR */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '16px',
                marginTop: '8px',
                marginBottom: '32px',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Handjet", system-ui, sans-serif',
                    fontSize: `calc(${W} * 0.045)`,
                    fontWeight: 700,
                    color: '#4b5563',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {calMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  marginBottom: '4px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: 'center',
                      fontFamily: '"Handjet", system-ui, sans-serif',
                      fontSize: `calc(${W} * 0.032)`,
                      fontWeight: 600,
                      color: '#9ca3af',
                      paddingBottom: '4px',
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '3px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {cells.map((day, idx) => {
                  if (!day)
                    return (
                      <div
                        key={`e-${idx}`}
                        style={{ aspectRatio: '1/1' }}
                      />
                    )

                  const dateKey = `${calYear}-${String(
                    calMonthIdx + 1,
                  ).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayEvents = eventsByDate[dateKey] || []
                  const hasEvt = dayEvents.length > 0

                  const isToday =
                    day === now.getDate() &&
                    calMonthIdx === now.getMonth() &&
                    calYear === now.getFullYear()

                  let bg = 'transparent'
                  let border = 'none'
                  let color = '#1f2937'
                  let fw = 500

                  if (hasEvt) {
  const s = circleStyle(dayEvents[0])
  bg = s.bg       // grey / orange / etc
  color = s.color // stays '#fff'
  fw = 700
} else if (isToday) {
  bg = '#ffffff'
  border = '2px solid #1f2937'
  fw = 700
}

                  const ring =
                    isToday && hasEvt
                      ? '0 0 0 2px #ffffff, 0 0 0 3.5px #1f2937'
                      : 'none'

                  return (
                    <div
                      key={dateKey}
                      onClick={() => handleDayPress(day)}
                      style={{
                        aspectRatio: '1/1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: hasEvt ? 'pointer' : 'default',
                      }}
                    >
                      <div
                        style={{
                          width: '85%',
                          aspectRatio: '1/1',
                          borderRadius: '50%',
                          backgroundColor: bg,
                          border,
                          boxShadow: ring,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <span
                          style={{
                            fontFamily:
                              '"Handjet", system-ui, sans-serif',
                            fontSize: `calc(${W} * 0.036)`,
                            fontWeight: fw,
                            color,
                            lineHeight: 1,
                            userSelect: 'none',
                          }}
                        >
                          {day}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* UPCOMING LIST */}
            {otherUpcomingEvents.length > 0 && (
              <div className="mb-8 space-y-3">
                {(() => {
                  let curMonth = null
                  const blocks = []
                  otherUpcomingEvents.forEach((ev) => {
                    const label = `${new Date(
                      ev.event_date,
                    ).getMonth() + 1}월`
                    if (label !== curMonth) {
                      curMonth = label
                      blocks.push(
                        <p
                          key={`m-${label}`}
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

            {/* TBD EVENTS */}
            {tbdEvents.length > 0 && (
              <div className="mb-8 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  TBD
                </p>
                {tbdEvents.map((ev) => renderEvent(ev))}
              </div>
            )}

            {/* PAST EVENTS */}
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
                      let curMonth = null
                      const blocks = []
                      pastEvents.forEach((ev) => {
                        const label = `${new Date(
                          ev.event_date,
                        ).getMonth() + 1}월`
                        if (label !== curMonth) {
                          curMonth = label
                          blocks.push(
                            <p
                              key={`pm-${label}`}
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

            {/* EMPTY STATE */}
            {allEvents.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="text-2xl mb-2">📅</p>
                <p className="text-gray-500 text-sm">
                  예정된 이벤트가 없어요
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      {(lightboxOpen || lightboxClosing) && displayImages.length > 0 && (
        <div
          onTouchStart={handleLbTouchStart}
          onTouchEnd={handleLbTouchEnd}
          className={lightboxClosing ? 'lb-close' : 'lb-open'}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top) + 16px)',
              right: 16,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              pointerEvents: 'none',
            }}
          >
            <ArrowsVertical size={16} weight="bold" />
            <span
              style={{
                fontFamily: '"Handjet", system-ui, sans-serif',
                fontSize: 12,
                letterSpacing: '0.12em',
              }}
            >
              SWIPE TO CLOSE
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 16px',
            }}
          >
            <img
              key={`${selectedEvent?.id ?? 'none'}-${lightboxIndex}`}
              src={displayImages[lightboxIndex]}
              alt=""
              className={
                lightboxClosing
                  ? ''
                  : lbSlideDir === -1
                  ? 'lb-slide-left'
                  : lbSlideDir === 1
                  ? 'lb-slide-right'
                  : ''
              }
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
              draggable={false}
            />
          </div>

          {displayImages.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '28px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {displayImages.map((_, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setLbSlideDir(i > lightboxIndex ? -1 : 1)
                    setLightboxIndex(i)
                  }}
                  style={{
                    width: i === lightboxIndex ? 8 : 6,
                    height: i === lightboxIndex ? 8 : 6,
                    borderRadius: '50%',
                    backgroundColor:
                      i === lightboxIndex
                        ? '#fff'
                        : 'rgba(255,255,255,0.35)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
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
      {/* Category slider */}
      <div
        className="bg-white px-3 py-3 flex gap-2 overflow-x-auto flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
      >
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