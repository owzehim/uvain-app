import { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MapView from '../components/MapView'
import { SpotCard, RichText } from '../components/SpotCard'
import { MAP_CATEGORIES, CATEGORY_ICONS_WHITE, CATEGORY_ICONS_ORANGE, CATEGORY_ICONS_BLACK } from '../lib/mapCategories'
import { getVisibleMapCategories } from '../lib/mapCategoryVisibility'
import { QrCode, Calendar, MapPin, Gear, UserCircle, List, ArrowsVertical, SortAscending, SortDescending, CaretRight, CaretDoubleRight } from '@phosphor-icons/react'
import { useReviewPrompt } from '../hooks/useReviewPrompt'
import ReviewModal from '../components/ReviewModal'
import ActivityStatsCard from '../components/ActivityStatsCard'
import QRScanner from '../components/QRScanner'
import StampCardMini from '../features/stampCard/components/StampCardMini'
import StampCardModal from '../features/stampCard/components/StampCardModal'

const MEMBER_ACTIVE_TAB_KEY = 'uvain_member_active_tab'
const MEMBER_TABS = ['qr', 'events', 'map']
const MEMBER_EVENT_LIST_OPEN_KEY = 'uvain_member_event_list_open'
const MEMBER_BOTTOM_TAB_PADDING = 42

function getStoredMemberTab() {
  if (typeof window === 'undefined') return 'qr'
  const storedTab = window.sessionStorage.getItem(MEMBER_ACTIVE_TAB_KEY)
  return MEMBER_TABS.includes(storedTab) ? storedTab : 'qr'
}

function getStoredEventListOpen() {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(MEMBER_EVENT_LIST_OPEN_KEY) === '1'
}

export default function MemberPage() {
  const [authUserId, setAuthUserId] = useState(null)
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState(getStoredMemberTab)
  const [tabKey, setTabKey] = useState(0)
  const [events, setEvents] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [qrCardLifted, setQrCardLifted] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const scannerOpenSignal = location.state?.reopenQrScanner || 0

  // Review prompt hook
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
      setAuthUserId(user.id)

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
      if (e.touches.length === 1 && e.touches[0]?.clientX < 30) e.preventDefault()
    }
    document.addEventListener('touchstart', handler, { passive: false })
    return () => document.removeEventListener('touchstart', handler)
  }, [])

  const handleTabChange = (key) => {
    window.sessionStorage.setItem(MEMBER_ACTIVE_TAB_KEY, key)
    setActiveTab(key)
    setTabKey((prev) => prev + 1)
    if (key !== 'qr') {
      setQrCardLifted(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#121212]">
        <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
      </div>
    )
  }

  const isValid =
    member?.is_member &&
    member?.membership_valid_until &&
    new Date(member.membership_valid_until) >= new Date()

  return (
    <div
      className="member-app-shell relative flex flex-col bg-white overflow-hidden dark:bg-[#121212]"
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
    className="relative bg-white flex items-center justify-between flex-shrink-0 dark:bg-[#121212]"
    style={{
      paddingTop: 'calc(env(safe-area-inset-top) + 6px)',
      minHeight: 'calc(env(safe-area-inset-top) + 56px)',
    }}
  >
    <div className="w-[60px]" />
    <div className="flex gap-2 items-center">
      {isAdmin && (
        <button
          onClick={() => {
            window.location.href = '/admin'
          }}
          className="fixed flex items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          style={{
            right: '66px',
            top: 'calc(env(safe-area-inset-top) + 6px)',
            height: '44px',
            zIndex: 70,
          }}
        >
          관리자
        </button>
      )}
      <button
        onClick={() => navigate('/settings')}
        className="fixed flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Settings"
        style={{
          right: '14px',
          top: 'calc(env(safe-area-inset-top) + 6px)',
          zIndex: 70,
        }}
      >
        {/* CHANGED: size={20} → size={22} to match the MY tab gear icon */}
        <Gear size={22} weight="bold" />
      </button>
    </div>
  </div>
)}

            {/* Floating admin + settings buttons for MY tab (no header) */}
      {activeTab === 'qr' && (
        <div
          className={
            'fixed flex items-center gap-2 transition-opacity duration-200 ' +
            (qrCardLifted ? 'opacity-0 pointer-events-none' : 'opacity-100')
          }
          style={{
            right: '14px',
            top: 'calc(env(safe-area-inset-top) + 6px)',
            zIndex: 70,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isAdmin && (
            <button
              onClick={() => {
                window.location.href = '/admin'
              }}
              className="flex items-center rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
              style={{
                height: '44px',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              관리자
            </button>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="flex h-11 w-11 items-center justify-center text-gray-500 dark:text-gray-300"
            aria-label="Settings"
            style={{
              background: 'transparent',
              boxShadow: 'none',
              borderRadius: 0,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Gear size={22} weight="bold" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div key={tabKey} className="h-full">
          {activeTab === 'qr' && (
            <QRTab
              member={member}
              isValid={isValid}
              scannerOpenSignal={scannerOpenSignal}
              onLiftChange={(lifted) => setQrCardLifted(lifted)}
            />
          )}
          {activeTab === 'events' && <EventsTab events={events} />}
          {activeTab === 'map' && (
  <MapTab
    restaurants={restaurants}
    member={member}
    isValid={isValid}
    isAdmin={isAdmin}
    authUserId={authUserId}
  />
)}        </div>
      </div>

      {/* Bottom tab bar */}
      <div
  className="bg-white flex flex-shrink-0 dark:bg-[#121212]"
  style={{
    paddingBottom: MEMBER_BOTTOM_TAB_PADDING,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    position: 'relative',
    zIndex: 40,           // sits above the button (zIndex: 35) so button slides from behind
  }}
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
                'flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors select-none ' +
                (active ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500')
              }
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
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

// Pastel avatar colors
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

// Membership Card
function MembershipCard({
  member,
  isValid,
  onQRScanned,
  disabled = false,
  onFlipChange,
  darkMode = false,
  scannerOpenSignal = 0,
}) {
  const [flipped, setFlipped] = useState(false)

  const W = 'min(calc(100vw - 32px), 398px)'
  const cardW = W
  const cardH = `calc(${W} * 1.586)`
  const fs = {
    brand: `calc(${W} * 0.038)`,
    valid: `calc(${W} * 0.032)`,
    name: `calc(${W} * 0.052)`,
    wordmark: `calc(${W} * 0.18)`,
  }

  const avatarSeed = `${member?.first_name || ''}${member?.last_name || ''}`
  const pastelBg = getPastelColor(avatarSeed)
  const avatarSize = `calc(${W} * 0.21)`
  const hasProfileImage = !!member?.profile_image_url
  const qrOutlineSize = `calc((${W} - 48px) * 0.6875)`
  const BRACKET = 24
  const cardBg = darkMode ? '#1C1C1E' : '#F6F4F1'
  const cardBorder = darkMode ? '#2C2C2E' : '#d6d3c0'
  const cardShadow = darkMode
    ? '0 18px 38px rgba(0,0,0,0.34)'
    : '0 14px 35px rgba(15,23,42,0.09)'
  const primaryText = darkMode ? '#F7F8F9' : '#2C2A27'
  const secondaryText = darkMode ? '#A1A1AA' : '#6b6a5e'
  const mutedText = darkMode ? '#6F6F76' : 'rgba(44,42,39,0.4)'
  const faintText = darkMode ? '#5F5F66' : 'rgba(44,42,39,0.25)'
  const scannerLine = darkMode ? '#8E8E93' : 'rgba(44,42,39,0.3)'
  const avatarIconColor = 'rgba(44,42,39,0.55)'

  useEffect(() => {
    if (onFlipChange) onFlipChange(flipped)
  }, [flipped, onFlipChange])

  useEffect(() => {
    if (scannerOpenSignal) setFlipped(true)
  }, [scannerOpenSignal])

  const cardFront = (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: cardShadow,
        padding: `calc(${W} * 0.07)`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* TOP */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            background: hasProfileImage ? 'transparent' : pastelBg,
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          {hasProfileImage ? (
            <img
              src={member.profile_image_url}
              alt="Profile"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <UserCircle
              size="72%"
              weight="fill"
              color={avatarIconColor}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: `calc(${W} * 0.01)`,
            textAlign: 'right',
          }}
        >
          <span
            style={{
              fontFamily: '"Handjet", system-ui, sans-serif',
              fontSize: fs.brand,
              fontWeight: 700,
              color: primaryText,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            UvA-IN Membership
          </span>
          <span
            style={{
              fontFamily: '"Handjet", system-ui, sans-serif',
              fontSize: fs.valid,
              fontWeight: 500,
              color: secondaryText,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginTop: `calc(${W} * 0.012)`,
            }}
          >
            Valid Until{' '}
            {member?.membership_valid_until
              ? new Date(
                  member.membership_valid_until,
                ).toLocaleDateString('en-CA')
              : 'N/A'}
          </span>
          <span
            style={{
              fontFamily: '"Handjet", system-ui, sans-serif',
              fontSize: fs.name,
              fontWeight: 800,
              color: '#f97316',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginTop: `calc(${W} * 0.008)`,
            }}
          >
            {member?.first_name} {member?.last_name}
          </span>
        </div>
      </div>

      {/* MIDDLE */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '52px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: qrOutlineSize,
            height: qrOutlineSize,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: BRACKET,
              height: BRACKET,
              borderTop: `2.5px solid ${scannerLine}`,
              borderLeft: `2.5px solid ${scannerLine}`,
              borderRadius: '4px 0 0 0',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: BRACKET,
              height: BRACKET,
              borderTop: `2.5px solid ${scannerLine}`,
              borderRight: `2.5px solid ${scannerLine}`,
              borderRadius: '0 4px 0 0',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: BRACKET,
              height: BRACKET,
              borderBottom: `2.5px solid ${scannerLine}`,
              borderLeft: `2.5px solid ${scannerLine}`,
              borderRadius: '0 0 0 4px',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: BRACKET,
              height: BRACKET,
              borderBottom: `2.5px solid ${scannerLine}`,
              borderRight: `2.5px solid ${scannerLine}`,
              borderRadius: '0 0 4px 0',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: `calc(${W} * 0.02)`,
            }}
          >
            <QrCode
              size={`calc(${W} * 0.1)`}
              weight="bold"
              color={faintText}
            />
            <span
              style={{
                fontFamily: '"Handjet", system-ui, sans-serif',
                fontSize: `calc(${W} * 0.034)`,
                fontWeight: 600,
                color: mutedText,
                letterSpacing: '0.05em',
              }}
            >
              눌러서 Check-IN 하기
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            fontFamily: '"Alien Block", "Arial Black", Impact, sans-serif',
            fontSize: fs.wordmark,
            fontWeight: 900,
            color: darkMode ? '#A1A1AA' : '#2C2A27',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          UvA-IN
        </span>
      </div>
    </div>
  )

  if (!isValid) {
    return (
      <div
        style={{
          width: cardW,
          height: cardH,
          margin: '0 auto',
          flexShrink: 0,
          borderRadius: '16px',
          border: `2px dashed ${darkMode ? '#2C2C2E' : '#d1d5db'}`,
          background: cardBg,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: darkMode ? '#F7F8F9' : '#4b5563',
          textAlign: 'center',
          padding: '16px',
          fontFamily: '"Handjet", system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize: fs.valid, fontWeight: 500 }}>
          활성화된 멤버십이 없습니다
        </span>
        {member?.first_name && (
          <span
            style={{
              marginTop: '4px',
              fontSize: fs.valid,
              color: darkMode ? '#A1A1AA' : '#6b7280',
            }}
          >
            {member.first_name} {member.last_name}
          </span>
        )}
        <span
          style={{
            marginTop: '10px',
            fontSize: `calc(${W} * 0.028)`,
            color: darkMode ? '#6F6F76' : '#9ca3af',
          }}
        >
          멤버십 갱신은 임원에게 문의해주세요
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        width: cardW,
        height: cardH,
        margin: '0 auto',
        perspective: '1200px',
        flexShrink: 0,
        cursor: disabled ? 'default' : 'pointer',
      }}
      onClick={() => {
        if (disabled || !isValid) return
        setFlipped((f) => !f)
      }}
    >
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
        {/* Front face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            padding: '12px',
            boxSizing: 'border-box',
            zIndex: 1,
          }}
        >
          {cardFront}
        </div>

        {/* Back face (camera) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            padding: '12px',
            boxSizing: 'border-box',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: '16px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {flipped && <QRScanner onScan={onQRScanned} darkMode={darkMode} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// QR Tab
function QRTab({ member, isValid, scannerOpenSignal = 0, onLiftChange }) {
  const navigate = useNavigate()
  const [lifted, setLifted] = useState(false)
  const [cardLiftOffset, setCardLiftOffset] = useState(0)
  const [isCardDragging, setIsCardDragging] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [darkMode, setDarkMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  const cardLayerRef = useRef(null)
  const activityRef = useRef(null)
  const touchStartY = useRef(null)
  const liftedRef = useRef(false)
  const W = 'min(calc(100vw - 32px), 398px)'
  const cardRestingOffsetPx = 0
  const liftedActivityGapPx = 0
  const cardRestingOffsetY = `${cardRestingOffsetPx}px`
  const inactiveCardRestingOffsetY = `${cardRestingOffsetPx}px`
  const guideTextGapY = '2px' // Increase for more space between the card and guide text.
  const fs = {
    guide: `calc(${W} * 0.032)`,
  }

  const getMaxLift = () =>
    (activityRef.current?.offsetHeight ?? 260) + cardRestingOffsetPx + liftedActivityGapPx

  const handleTouchStart = (e) => {
    if (cardFlipped) return
    touchStartY.current = e.touches[0].clientY
    setIsCardDragging(true)
  }

  const handleTouchMove = (e) => {
    if (cardFlipped) return
    if (touchStartY.current == null) return
    const dy = touchStartY.current - e.touches[0].clientY
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

    if (dy > SWIPE_THRESHOLD) {
      nextLifted = true
    } else if (dy < -SWIPE_THRESHOLD) {
      nextLifted = false
    }

    setCardLiftOffset(nextLifted ? max : 0)
    liftedRef.current = nextLifted
    setLifted(nextLifted)
    setIsCardDragging(false)
    touchStartY.current = null
  }

  useEffect(() => {
    setCardLiftOffset(lifted ? getMaxLift() : 0)
    if (onLiftChange) onLiftChange(lifted)
  }, [lifted, onLiftChange])

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return undefined

    const syncDarkMode = () => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    }
    const observer = new MutationObserver(syncDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    syncDarkMode()

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!scannerOpenSignal) return
    setLifted(false)
    liftedRef.current = false
    if (onLiftChange) onLiftChange(false)
  }, [scannerOpenSignal, onLiftChange])

  const handleQRScanned = (rawValue) => {
    setLifted(false)
    liftedRef.current = false
    if (onLiftChange) onLiftChange(false)
    navigate('/scan', { state: { rawValue, returnToMemberScanner: true } })
  }

  if (!isValid) {
    if (onLiftChange) onLiftChange(false)
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-4 py-6 no-highlight-zone"
        style={{
          transform: `translate3d(0, ${inactiveCardRestingOffsetY}, 0)`,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <MembershipCard member={member} isValid={false} darkMode={darkMode} />
      </div>
    )
  }

  // Scanning state
  return (
    <div
      className="no-highlight-zone"
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Recent activity + long fade when lifted */}
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
          backgroundColor: darkMode ? '#121212' : '#ffffff',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          transform: `translate3d(0, calc(${cardRestingOffsetY} - ${cardLiftOffset}px), 0)`,
          transition: isCardDragging
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: W,
          }}
        >
          <MembershipCard
            member={member}
            isValid={isValid}
            onQRScanned={handleQRScanned}
            disabled={lifted}
            onFlipChange={setCardFlipped}
            darkMode={darkMode}
            scannerOpenSignal={scannerOpenSignal}
          />
          <div
            style={{
              position: 'absolute',
              top: `calc(100% + ${guideTextGapY})`,
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              paddingRight: '20px',
              gap: 4,
            }}
          >
            {!cardFlipped && (
              <span
                style={{
                  fontSize: fs.guide,
                  lineHeight: 1,
                  color: darkMode ? '#FAFAFA' : 'rgba(44,42,39,0.35)',
                  fontWeight: 500,
                  transition: 'color 0.25s ease',
                }}
              >
                {lifted
                  ? '내려서 Check-IN 하기'
                  : '위로 올려서 최근 활동 보기'}
              </span>
            )}
            {cardFlipped && (
              <span
                style={{
                  fontSize: fs.guide,
                  lineHeight: 1,
                  color: darkMode ? '#FAFAFA' : 'rgba(44,42,39,0.35)',
                  fontWeight: 500,
                }}
              >
                눌러서 돌아가기
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top fade ??soften the safe-area/card line when lifted */}
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
              darkMode
                ? 'linear-gradient(to bottom, rgba(18,18,18,1), rgba(18,18,18,0))'
                : 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))',
            zIndex: 30,
          }}
        />
      )}
    </div>
  )
}

// Nav Button (not currently used, but kept for future)
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

// Event Lightbox (SpotCard-style)
function EventLightbox({ imgs, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex)
  const [visible, setVisible] = useState(false)
  const [slideDirection, setSlideDirection] = useState(0)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const lightboxDotsBottom = 'calc(env(safe-area-inset-bottom) + 10px)'

  const goToIndex = (nextIndex) => {
    const clampedIndex = Math.max(0, Math.min(nextIndex, imgs.length - 1))
    if (clampedIndex === index) return
    setSlideDirection(clampedIndex > index ? 1 : -1)
    setIndex(clampedIndex)
  }

  // zoom-in + fade-in on open
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    ;[index, index - 1, index + 1]
      .filter((nextIndex) => nextIndex >= 0 && nextIndex < imgs.length)
      .forEach((nextIndex) => {
        const image = new Image()
        image.decoding = 'async'
        image.src = imgs[nextIndex]
        image.decode?.().catch(() => {})
      })
  }, [imgs, index])

  useEffect(() => {
    setIndex(startIndex)
    setSlideDirection(0)
  }, [startIndex, imgs])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowRight') goToIndex(index + 1)
      if (e.key === 'ArrowLeft') goToIndex(index - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs.length, index])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => onClose?.(), 250)
  }

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

    // Vertical swipe (up or down) ??close
    if (absDy > absDx && absDy > 60) {
      handleClose()
    }
    // Horizontal swipe ??next / prev
    else if (absDx > absDy && absDx > 40) {
      if (dx < 0) {
        // swipe left ??next
        goToIndex(index + 1)
      } else {
        // swipe right ??prev
        if (index === 0) handleClose()
        else goToIndex(index - 1)
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  if (!imgs || imgs.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes lightboxZoomIn {
          from { transform: scale(0.9); }
          to { transform: scale(1); }
        }
        .lightbox-zoom-enter {
          animation: lightboxZoomIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes lightboxImageSlideInFromRight {
          from { opacity: 0.68; transform: translate(44px, -18px); }
          to { opacity: 1; transform: translate(0, -18px); }
        }
        @keyframes lightboxImageSlideInFromLeft {
          from { opacity: 0.68; transform: translate(-44px, -18px); }
          to { opacity: 1; transform: translate(0, -18px); }
        }
        @keyframes lightboxImageFadeIn {
          from { opacity: 0.72; transform: translateY(-18px); }
          to { opacity: 1; transform: translateY(-18px); }
        }
        .lightbox-image-slide {
          animation: lightboxImageFadeIn 0.34s cubic-bezier(0.22,1,0.36,1);
        }
        .lightbox-image-slide-right {
          animation: lightboxImageSlideInFromRight 0.34s cubic-bezier(0.22,1,0.36,1);
        }
        .lightbox-image-slide-left {
          animation: lightboxImageSlideInFromLeft 0.34s cubic-bezier(0.22,1,0.36,1);
        }
      `}</style>
      <div
        className="no-highlight-zone"
        onClick={handleClose}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={visible ? 'lightbox-zoom-enter' : ''}
          style={{
            width: '100%',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {/* Image */}
          <img
            key={index}
            className={
              slideDirection > 0
                ? 'lightbox-image-slide-right'
                : slideDirection < 0
                  ? 'lightbox-image-slide-left'
                  : 'lightbox-image-slide'
            }
            src={imgs[index]}
            decoding="async"
            fetchPriority="high"
            loading="eager"
            alt={`사진 ${index + 1}`}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 12,
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              transform: 'translateY(-18px)',
            }}
          />

        </div>

        {/* Dots */}
        {imgs.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: lightboxDotsBottom,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {imgs.map((_, i) => (
              <div
                key={i}
                onClick={(e) => {
                  e.stopPropagation()
                  goToIndex(i)
                }}
                style={{
                  width: i === index ? 8 : 6,
                  height: i === index ? 8 : 6,
                  borderRadius: '999px',
                  background:
                    i === index ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// Events Tab
function EventsTab({ events }) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const toLocalDateKey = (value) => {
    if (!value) return ''
    const s = String(value)
    if (s.includes('T') || s.includes('Z') || /[+-]\d{2}:\d{2}$/.test(s)) {
      const d = new Date(s)
      if (!Number.isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0',
        )}-${String(d.getDate()).padStart(2, '0')}`
      }
    }
    return s.slice(0, 10)
  }

  const parseLocalDate = (value) => {
    if (!value) return new Date(NaN)
    const key = toLocalDateKey(value)
    const [year, month, day] = key.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const getEventDates = (ev) => {
    if (!ev) return []
    const dates = Array.isArray(ev.event_dates) ? ev.event_dates : []
    const allDates = [...dates, ev.event_date].filter(Boolean)
    const unique = Array.from(new Set(allDates.map((date) => toLocalDateKey(date))))
    return unique.length ? unique : []
  }

  const getPrimaryEventDate = (ev) => getEventDates(ev)[0] || ev?.event_date
  const getPrimaryEventDateTime = (ev) => {
    const dates = Array.isArray(ev?.event_dates) ? ev.event_dates : []
    return dates[0] || ev?.event_date
  }

  // Split & sort
  const datedEvents = events.filter((ev) => getPrimaryEventDate(ev))

  const tbdEvents = events
    .filter((ev) => !getPrimaryEventDate(ev))
    .sort((a, b) =>
      a.created_at && b.created_at
        ? new Date(a.created_at) - new Date(b.created_at)
        : 0,
    )

  const futureEvents = datedEvents
    .filter((ev) => new Date(getPrimaryEventDateTime(ev)) >= now)
    .sort((a, b) => new Date(getPrimaryEventDateTime(a)) - new Date(getPrimaryEventDateTime(b)))

  const pastEvents = datedEvents
    .filter((ev) => new Date(getPrimaryEventDateTime(ev)) < now)
    .sort((a, b) => new Date(getPrimaryEventDateTime(b)) - new Date(getPrimaryEventDateTime(a)))

  const nextEvent = futureEvents[0] || null
  const otherUpcomingEvents = nextEvent ? futureEvents.slice(1) : futureEvents
  const eventTabEvents = [...futureEvents.slice().reverse(), ...pastEvents, ...tbdEvents]
  const allEvents = eventTabEvents
  const initialEvent = nextEvent || allEvents[0] || null

  const [selectedEvent, setSelectedEvent] = useState(initialEvent)
  const [previewEvent, setPreviewEvent] = useState(initialEvent)
  const [isDragging, setIsDragging] = useState(false)
  const [isTouching, setIsTouching] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [slideIndexes, setSlideIndexes] = useState({})
  const [eventListOpen, setEventListOpen] = useState(getStoredEventListOpen)
  const [eventListClosing, setEventListClosing] = useState(false)
  const [eventListNewestFirst, setEventListNewestFirst] = useState(true)
  const [eventCardOpen, setEventCardOpen] = useState(false)
  const [eventSwipeDirection, setEventSwipeDirection] = useState(0)
  const [loadedEventPreviewImages, setLoadedEventPreviewImages] = useState({})
  const [darkMode, setDarkMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  // SpotCard-style Lightbox index
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const [imageAspectRatios, setImageAspectRatios] = useState({})
  const [frontPanelTextColor, setFrontPanelTextColor] = useState('#1f2937')
  const [calMonth, setCalMonth] = useState(() => {
    const base = getPrimaryEventDate(initialEvent)
      ? parseLocalDate(getPrimaryEventDate(initialEvent))
      : now
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const containerRef = useRef(null)
  const eventSwipeStartX = useRef(null)
  const eventSwipeStartY = useRef(null)
  const eventCardStartY = useRef(null)
  const eventPreviewTouchStartX = useRef(null)
  const eventPreviewTouchStartY = useRef(null)

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return undefined

    const syncDarkMode = () => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    }
    const observer = new MutationObserver(syncDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    syncDarkMode()

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!initialEvent) return
    const selectedStillExists = selectedEvent && allEvents.some((ev) => ev.id === selectedEvent.id)
    if (selectedStillExists) return
    setSelectedEvent(initialEvent)
    setPreviewEvent(initialEvent)
  }, [initialEvent, selectedEvent, allEvents])

  useEffect(() => {
    const selectedDate = getPrimaryEventDate(selectedEvent)
    if (!selectedDate) return
    const d = parseLocalDate(selectedDate)
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [selectedEvent])

  const setSlide = (id, idx) =>
    setSlideIndexes((p) => ({
      ...p,
      [id]: idx,
    }))

  useEffect(() => {
    if (!selectedEvent?.id) return
    setSlide(selectedEvent.id, 0)
  }, [selectedEvent?.id])

  // Load image dimensions to detect aspect ratio
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

  // Keyboard nav for image slider in expanded cards
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

  // Vertical drag between events in header
  const pointerStartY = useRef(null)
  const dragBaseIdxRef = useRef(0)
  const currentDragIdxRef = useRef(0)
  const activePointerIdRef = useRef(null)
  const allEventsRef = useRef(allEvents)
  const selectedEventRef = useRef(selectedEvent)

  const currentEventIndex = allEvents.findIndex(
    (ev) => ev.id === selectedEvent?.id,
  )
  const activeEventIndex = currentEventIndex >= 0
    ? currentEventIndex
    : Math.max(0, allEvents.findIndex((ev) => ev.id === initialEvent?.id))
  const scrollProgress = 0

  useEffect(() => {
    allEventsRef.current = allEvents
    selectedEventRef.current = selectedEvent
  }, [allEvents, selectedEvent])

  const resetDragState = () => {
    pointerStartY.current = null
    dragBaseIdxRef.current = activeEventIndex
    currentDragIdxRef.current = activeEventIndex
    activePointerIdRef.current = null
    setIsDragging(false)
    setIsTouching(false)
    setPreviewEvent(selectedEventRef.current)
  }

  const finalizeDrag = () => {
    if (pointerStartY.current == null) return
    resetDragState()
  }

  const updateDraggedEvent = (clientY) => {
    if (pointerStartY.current == null) return
    const eventsNow = allEventsRef.current
    if (!eventsNow.length) return

    const dy = pointerStartY.current - clientY
    const delta =
      dy > 0 ? Math.floor(dy / 60) : dy < 0 ? Math.ceil(dy / 60) : 0
    const idx = Math.max(
      0,
      Math.min(dragBaseIdxRef.current + delta, eventsNow.length - 1),
    )

    if (idx === currentDragIdxRef.current) return

    currentDragIdxRef.current = idx
    const nextEvent = eventsNow[idx]
    selectedEventRef.current = nextEvent
    setSelectedEvent(nextEvent)
    setPreviewEvent(nextEvent)
  }

  const handleContainerPointerDown = (e) => {
    if (!e.isPrimary || e.button !== 0) return
    if (e.target.closest('button, a, input, textarea, select')) return

    const rect = containerRef.current?.getBoundingClientRect()
    // Avoid grabbing when finger starts too low (near calendar)
    if (rect && e.clientY > rect.bottom - 60) return

    activePointerIdRef.current = e.pointerId
    pointerStartY.current = e.clientY
    dragBaseIdxRef.current = activeEventIndex
    currentDragIdxRef.current = activeEventIndex
    setIsDragging(false)
    setIsTouching(true)
    setPreviewEvent(selectedEventRef.current)

    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handleContainerPointerMove = (e) => {
    if (e.pointerId !== activePointerIdRef.current) return
    updateDraggedEvent(e.clientY)
  }

  const handleContainerPointerEnd = (e) => {
    if (e.pointerId !== activePointerIdRef.current) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    finalizeDrag()
  }

  const handleContainerPointerCancel = (e) => {
    if (e.pointerId !== activePointerIdRef.current) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    finalizeDrag()
  }

  // Helper to open lightbox at specific index
  const openLightboxAt = (index) => {
    setLightboxIndex(index)
  }

  const handleEventPreviewTouchStart = (e) => {
    if (!eventCardOpen) return
    eventPreviewTouchStartX.current = e.touches[0].clientX
    eventPreviewTouchStartY.current = e.touches[0].clientY
  }

  const handleEventPreviewTouchEnd = (e) => {
    if (!eventCardOpen) return
    if (eventPreviewTouchStartX.current == null || eventPreviewTouchStartY.current == null) return
    if (!displayEvent || displayImages.length <= 1) return

    const dx = e.changedTouches[0].clientX - eventPreviewTouchStartX.current
    const dy = e.changedTouches[0].clientY - eventPreviewTouchStartY.current
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    const currentSlide = slideIndexes[displayEvent.id] || 0

    if (absDx > absDy && absDx > 40) {
      e.stopPropagation()
      if (dx < 0) {
        setSlide(displayEvent.id, Math.min(currentSlide + 1, displayImages.length - 1))
      } else {
        setSlide(displayEvent.id, Math.max(currentSlide - 1, 0))
      }
    }

    eventPreviewTouchStartX.current = null
    eventPreviewTouchStartY.current = null
  }

  // Formatting helpers
  const getDayDiff = (s) => {
    const d = parseLocalDate(s)
    return Math.round(
      (new Date(d.getFullYear(), d.getMonth(), d.getDate()) - todayStart) /
        86400000,
    )
  }

  const formatTopDate = (dateStr) => {
    if (!dateStr) return null
    const date = parseLocalDate(dateStr)
    return {
      dayName: date
        .toLocaleDateString('en-US', { weekday: 'short' })
        .replace('.', ''),
      dateNum: String(date.getDate()).padStart(2, '0'),
      monthName: date
        .toLocaleDateString('en-US', { month: 'long' })
        .toUpperCase(),
      year: date.getFullYear(),
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

  const formatTimeRange = (ev) => {
    const startDate = getPrimaryEventDateTime(ev)
    if (!startDate) return ''
    const start = new Date(startDate)
    const end = ev.event_end_date ? new Date(ev.event_end_date) : null
    const formatParts = (date) => {
      let h = date.getHours()
      const m = String(date.getMinutes()).padStart(2, '0')
      const ampm = h >= 12 ? 'PM' : 'AM'
      h = h % 12 || 12
      return { time: `${String(h).padStart(2, '0')}:${m}`, ampm }
    }
    const startParts = formatParts(start)
    if (!end || Number.isNaN(end.getTime())) {
      return `${startParts.time} ${startParts.ampm}`
    }
    const endParts = formatParts(end)
    if (startParts.ampm === endParts.ampm) {
      return `${startParts.time} - ${endParts.time} ${endParts.ampm}`
    }
    return `${startParts.time} ${startParts.ampm} - ${endParts.time} ${endParts.ampm}`
  }

  const plainText = (value) => {
    if (!value) return ''
    const el = document.createElement('div')
    el.innerHTML = value
    return (el.textContent || el.innerText || '').trim()
  }

  const getEventStatus = (ev) => {
    if (!ev) return ''
    const eventDate = getPrimaryEventDateTime(ev)
    if (!eventDate) return 'TBD'
    const days = getDayDiff(eventDate)
    if (days < 0) return 'PAST'
    if (nextEvent && ev.id === nextEvent.id)
      return days === 0 ? 'TODAY' : `D-${days}`
    return 'UPCOMING'
  }

  const addToCalendar = (ev) => {
    const startDate = getPrimaryEventDateTime(ev)
    if (!startDate) return
    const start = new Date(startDate)
    const end = ev.event_end_date
      ? new Date(ev.event_end_date)
      : new Date(start.getTime() + 7200000)

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
      `LOCATION:${plainText(ev.location)}\n` +
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

  const openParticipationForm = (ev) => {
    if (!ev?.participation_url || ev?.is_registration_closed) return
    window.open(ev.participation_url, '_blank', 'noopener,noreferrer')
  }

  const W = 'min(calc(100vw - 32px), 398px)'
  const fs = {
    day: `calc(${W} * 0.06)`,
    date: `calc(${W} * 0.24)`,
    month: `calc(${W} * 0.255)`,
    guide: `calc(${W} * 0.032)`, // same as MY tab guide
  }
  // Events hero alignment knobs:
  // - eventHeroThumbSize locks the lightbox square size.
  // - eventDateTopNudge/eventDateBottomNudge tune the visible font edges.
  // - eventDateNumberStretch stretches the number row downward toward the month.
  const eventHeroThumbSize = `calc(${W} * 0.46)`
  const eventDateTopNudge = '-4px'
  const eventDateBottomNudge = '6px'
  const eventDateNumberStretch = 1.35
  const eventDateTop = '1px'
  const eventDetailsTop = '186px'
  const eventCollapsedCardHeight = '260px'
  const eventCardTranslateY = eventCardOpen
    ? '0'
    : `calc(100% - ${eventCollapsedCardHeight})`
  const displayEvent = selectedEvent

  const eventsByDate = {}
  datedEvents.forEach((ev) => {
    getEventDates(ev).forEach((key) => {
      if (!eventsByDate[key]) eventsByDate[key] = []
      eventsByDate[key].push(ev)
    })
  })

  const displayEventDate = getPrimaryEventDate(displayEvent)
  const displayCalMonth = displayEventDate
    ? (() => {
        const d = parseLocalDate(displayEventDate)
        return new Date(d.getFullYear(), d.getMonth(), 1)
      })()
    : calMonth
  const calYear = displayCalMonth.getFullYear()
  const calMonthIdx = displayCalMonth.getMonth()

  const cells = [
    ...Array(new Date(calYear, calMonthIdx, 1).getDay()).fill(null),
    ...Array.from(
      {
        length: new Date(calYear, calMonthIdx + 1, 0).getDate(),
      },
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

  const closeEventList = () => {
    window.sessionStorage.removeItem(MEMBER_EVENT_LIST_OPEN_KEY)
    setEventListClosing(true)
    window.setTimeout(() => {
      setEventListOpen(false)
      setEventListClosing(false)
    }, 220)
  }

  const selectEventFromList = (ev) => {
    window.sessionStorage.removeItem(MEMBER_EVENT_LIST_OPEN_KEY)
    setSelectedEvent(ev)
    setPreviewEvent(ev)
    setEventCardOpen(false)
    setExpandedId(null)
    setLightboxIndex(null)
    setIsDragging(false)
    setIsTouching(false)
    setEventListClosing(true)
    window.setTimeout(() => {
      setEventListOpen(false)
      setEventListClosing(false)
    }, 220)
  }

  const selectAdjacentEvent = (direction) => {
    if (!allEvents.length) return
    const currentIndex = allEvents.findIndex((ev) => ev.id === selectedEvent?.id)
    const baseIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = Math.max(
      0,
      Math.min(baseIndex + direction, allEvents.length - 1),
    )
    if (nextIndex === baseIndex) return
    setEventSwipeDirection(direction)
    setSelectedEvent(allEvents[nextIndex])
    setPreviewEvent(allEvents[nextIndex])
    setEventCardOpen(false)
    window.setTimeout(() => setEventSwipeDirection(0), 320)
  }

  const handleFrameworkTouchStart = (e) => {
    eventSwipeStartX.current = e.touches[0].clientX
    eventSwipeStartY.current = e.touches[0].clientY
  }

  const handleFrameworkTouchEnd = (e) => {
    if (eventSwipeStartX.current == null || eventSwipeStartY.current == null) return

    const dx = e.changedTouches[0].clientX - eventSwipeStartX.current
    const dy = e.changedTouches[0].clientY - eventSwipeStartY.current
    eventSwipeStartX.current = null
    eventSwipeStartY.current = null

    if (Math.abs(dx) < 54 || Math.abs(dx) < Math.abs(dy) * 1.25) return
    selectAdjacentEvent(dx < 0 ? 1 : -1)
  }

  const handleEventCardTouchStart = (e) => {
    eventCardStartY.current = e.touches[0].clientY
  }

  const handleEventCardTouchEnd = (e) => {
    if (eventCardStartY.current == null) return
    const dy = e.changedTouches[0].clientY - eventCardStartY.current
    eventCardStartY.current = null

    if (dy < -42) setEventCardOpen(true)
    if (dy > 42) setEventCardOpen(false)
  }

  const getListDateParts = (ev) => {
    const date = getPrimaryEventDateTime(ev)
    if (!date) {
      return {
        year: 'TBD',
        month: 'TBD',
        day: '--',
        weekday: 'TBD',
      }
    }

    const d = new Date(date)
    return {
      year: String(d.getFullYear()),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      day: String(d.getDate()),
      weekday: d
        .toLocaleDateString('en-US', { weekday: 'short' })
        .toUpperCase(),
    }
  }

  const getListSortTime = (ev) => {
    const date = getPrimaryEventDateTime(ev)
    return date ? new Date(date).getTime() : Number.POSITIVE_INFINITY
  }

  const sortedListEvents = allEvents.slice().sort((a, b) => {
    const aTime = getListSortTime(a)
    const bTime = getListSortTime(b)
    if (aTime !== bTime) {
      return eventListNewestFirst ? bTime - aTime : aTime - bTime
    }
    return String(a.title || '').localeCompare(String(b.title || ''))
  })

  const groupedListEvents = sortedListEvents.reduce((years, ev) => {
    const parts = getListDateParts(ev)
    let yearGroup = years.find((group) => group.year === parts.year)
    if (!yearGroup) {
      yearGroup = { year: parts.year, months: [] }
      years.push(yearGroup)
    }

    let monthGroup = yearGroup.months.find((group) => group.month === parts.month)
    if (!monthGroup) {
      monthGroup = { month: parts.month, events: [] }
      yearGroup.months.push(monthGroup)
    }

    monthGroup.events.push(ev)
    return years
  }, [])

  const renderEvent = (ev) => {
    if (!ev) return null
    const isExpanded = expandedId === ev.id
    const imgs = ev.image_urls || []
    const instaUrl = ev.instagram_url
    const currentSlide = slideIndexes[ev.id] || 0

    return (
      <div
        key={ev.id}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden dark:border-[#2c2c2e] dark:bg-[#111111]"
      >
        <button
          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
          className="w-full text-left p-5"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-white">{ev.title}</p>
            <span className="text-gray-400 text-sm ml-2 dark:text-gray-500">
              {isExpanded ? '-' : '+'}
            </span>
          </div>
          {getPrimaryEventDate(ev) && (
            <div className="flex items-center gap-1.5 text-sm text-orange-500 mt-1">
              <Calendar size={14} weight="fill" />
              <span>
                {new Date(getPrimaryEventDateTime(ev)).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} {formatTimeRange(ev)}
              </span>
            </div>
          )}
          {ev.location && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5 dark:text-gray-400">
              <MapPin size={14} weight="fill" />
              <span>{plainText(ev.location)}</span>
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
                    className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800"
                    style={{ aspectRatio: '1/1' }}
                  >
                    <div
                      className="flex h-full"
                      style={{
                        transform: `translateX(-${
                          currentSlide * 100
                        }%)`,
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      {imgs.map((url, i) => (
                        <div
                          key={i}
                          className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
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
                            onClick={() => openLightboxAt(i)}
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
                  className="text-sm text-gray-600 mt-3 leading-relaxed block dark:text-gray-300"
                />
              )}
              <div className="flex gap-2 mt-3">
                {getPrimaryEventDate(ev) && (
                  <button
                    onClick={() => addToCalendar(ev)}
                    className="flex-1 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 dark:bg-gray-800 dark:text-gray-200"
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
                    Instagram에서 열기
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // First-panel image + color logic
  const displayImages = displayEvent?.image_urls || []
  const hasImages = displayImages.length > 0
  const displayImageRatios = imageAspectRatios[displayEvent?.id] || []
  const displayImageSlide = displayEvent ? slideIndexes[displayEvent.id] || 0 : 0

  useEffect(() => {
    if (!displayEvent || displayImages.length === 0) return
    if (displayImageSlide > displayImages.length - 1) {
      setSlide(displayEvent.id, displayImages.length - 1)
    }
  }, [displayEvent, displayImages.length, displayImageSlide])

  const PAST_DATE_COLOR = '#4b5563'
const PAST_DARK_DATE_COLOR = '#BDBDBD'
const DRAG_DATE_COLOR = '#9ca3af'

const isPastSelected =
  getEventStatus(displayEvent) === 'PAST'
const isNextSelected =
  Boolean(nextEvent && displayEvent && displayEvent.id === nextEvent.id)

const baseDateColor = isPastSelected ? PAST_DATE_COLOR : '#1f2937'

const effectiveDateColor = isDragging
  ? DRAG_DATE_COLOR
  : isNextSelected
    ? '#f97316'
  : darkMode && isPastSelected
    ? PAST_DARK_DATE_COLOR
    : darkMode
      ? '#F7F8F9'
      : baseDateColor

  const eventListBg = darkMode ? '#303236' : '#f2f3f5'
  const eventListFade =
    darkMode
      ? 'linear-gradient(180deg, #303236 0%, rgba(48,50,54,0.82) 42%, rgba(48,50,54,0) 100%)'
      : 'linear-gradient(180deg, #f2f3f5 0%, rgba(242,243,245,0.86) 42%, rgba(242,243,245,0) 100%)'
  const eventListIconColor = darkMode ? 'rgba(255,255,255,0.86)' : '#4b5563'
  const eventListYearColor = darkMode ? '#ffffff' : '#111827'
  const eventListCardStyle = darkMode
    ? {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderColor: 'rgba(255,255,255,0.12)',
        color: '#ffffff',
      }
    : {
        backgroundColor: '#fafafa',
        borderColor: '#e5e7eb',
        color: '#111827',
      }
  const eventListMutedColor = darkMode ? 'rgba(255,255,255,0.56)' : '#6b7280'
  const eventListDividerColor = darkMode ? 'rgba(255,255,255,0.12)' : '#e5e7eb'
  const eventListChevronColor = darkMode ? 'rgba(255,255,255,0.76)' : '#111827'

  const getTextColorFromImage = (imageUrl) =>
    new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const size = 48
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, size, size)

          const imageData = ctx.getImageData(0, 0, size, size).data
          let luminanceTotal = 0
          let samples = 0

          for (let y = 6; y < 34; y += 4) {
            for (let x = 6; x < 42; x += 4) {
              const idx = (y * size + x) * 4
              const r = imageData[idx]
              const g = imageData[idx + 1]
              const b = imageData[idx + 2]
              const srgb = [r, g, b].map((value) => {
                const channel = value / 255
                return channel <= 0.03928
                  ? channel / 12.92
                  : ((channel + 0.055) / 1.055) ** 2.4
              })
              luminanceTotal +=
                0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
              samples += 1
            }
          }

          const avgLuminance = luminanceTotal / Math.max(samples, 1)
          resolve(avgLuminance > 0.42 ? '#111827' : '#ffffff')
        } catch {
          resolve('#111827')
        }
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

  const detailImages = displayEvent?.image_urls || []
  const eventDateParts = getPrimaryEventDate(displayEvent)
    ? formatTopDate(getPrimaryEventDate(displayEvent))
    : null

  return (
    <>
      <style>{`
        @keyframes eventContentSlideInFromRight {
          from { opacity: 0; transform: translateX(44px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes eventContentSlideInFromLeft {
          from { opacity: 0; transform: translateX(-44px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes eventPreviewImageSlideInFromRight {
          from { opacity: 0.68; transform: translateX(44px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes eventPreviewImageSlideInFromLeft {
          from { opacity: 0.68; transform: translateX(-44px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div
        className="relative h-full overflow-hidden bg-white text-gray-950 no-highlight-zone dark:bg-[#121212] dark:text-white"
        onTouchStart={handleFrameworkTouchStart}
        onTouchEnd={handleFrameworkTouchEnd}
      >
        <button
          type="button"
          onClick={() => {
            setEventListNewestFirst(true)
            window.sessionStorage.setItem(MEMBER_EVENT_LIST_OPEN_KEY, '1')
            setEventListOpen(true)
          }}
          className="fixed flex h-11 w-11 items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
          aria-label="Open event list"
          style={{
            left: '14px',
            top: 'calc(env(safe-area-inset-top) + 6px)',
            zIndex: 70,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <List size={22} weight="bold" />
        </button>

        {displayEvent ? (
          <>
            <div className="absolute inset-0 bg-white dark:bg-[#121212]" />

            <div
              className="absolute left-0 right-0 px-6"
              style={{
                top: eventDateTop,
                zIndex: 5,
              }}
            >
              <div
                key={`event-bg-date-${displayEvent.id}`}
                className="mx-auto max-w-md"
                style={{
                  animation:
                    eventSwipeDirection === 0
                      ? 'none'
                      : `${eventSwipeDirection > 0 ? 'eventContentSlideInFromRight' : 'eventContentSlideInFromLeft'} 0.34s cubic-bezier(0.22,1,0.36,1)`,
                }}
              >
                {eventDateParts && (
                  <div className="flex flex-col items-start">
                    <span
  className="text-[89px] font-medium leading-[0.82] tracking-normal text-gray-950 dark:text-white"
  style={{
    transform: 'scaleY(1.25)',
    transformOrigin: 'top left',
  }}
>
  {eventDateParts.dateNum}
</span>
                    <p className="mt-7 text-[34px] font-medium leading-none uppercase text-gray-950 dark:text-white">
                      {eventDateParts.monthName}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <p className="text-[34px] font-medium leading-none text-gray-700 dark:text-gray-200">
                        {eventDateParts.dayName}
                      </p>
                      <span className="text-[34px] font-medium leading-none text-gray-700 dark:text-gray-200">
                        •
                      </span>
                      <p className="text-[34px] font-medium leading-none text-gray-700 dark:text-gray-200">
                        {eventDateParts.year}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className="absolute left-0 right-0 px-6"
              style={{
                top: eventDetailsTop,
                bottom: eventCardOpen ? '48%' : '250px',
                transition: 'bottom 0.28s ease',
                zIndex: 5,
              }}
            >
              <div
                key={`event-bg-details-${displayEvent.id}`}
                className="mx-auto max-w-md"
                style={{
                  animation:
                    eventSwipeDirection === 0
                      ? 'none'
                      : `${eventSwipeDirection > 0 ? 'eventContentSlideInFromRight' : 'eventContentSlideInFromLeft'} 0.34s cubic-bezier(0.22,1,0.36,1)`,
                }}
              >
                <p className="mb-3 inline-flex rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                  {getEventStatus(displayEvent)}
                </p>

                <h1 className="text-[34px] font-black leading-tight tracking-normal text-gray-950 dark:text-white">
                  {displayEvent.title || 'Untitled event'}
                </h1>

                <div className="mt-6 space-y-3 text-[13px] font-medium text-gray-700 dark:text-gray-200">
                  {getPrimaryEventDate(displayEvent) && (
                    <div className="flex items-center gap-2">
                      <Calendar size={18} weight="fill" color="#f97316" />
                      <span>{formatTimeRange(displayEvent)}</span>
                    </div>
                  )}
                  {displayEvent.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={18} weight="fill" color="#f97316" />
                      <span>{plainText(displayEvent.location)}</span>
                    </div>
                  )}
                  {displayEvent.location_description && (
                    <p className="pl-7 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {plainText(displayEvent.location_description)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              className="absolute left-0 right-0 bg-white dark:bg-[#121212]"
              onTouchStart={handleEventCardTouchStart}
              onTouchEnd={handleEventCardTouchEnd}
              style={{
                bottom: 0,
                height: '100%',
                transform: `translateY(${eventCardTranslateY})`,
                zIndex: 20,
                borderTopLeftRadius: eventCardOpen ? 0 : 20,
                borderTopRightRadius: eventCardOpen ? 0 : 20,
                boxShadow: 'none',
                transition:
                  'transform 0.35s cubic-bezier(0.4,0,0.2,1), border-radius 0.35s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
                willChange: 'transform',
              }}
            >
              <div className="flex justify-center pb-3 pt-2.5">
                <div className="h-1 w-10 rounded-full bg-gray-300" />
              </div>

              <div
                className="h-full overflow-y-auto px-5"
                style={{
                  paddingBottom: 'calc(env(safe-area-inset-bottom) + 116px)',
                }}
              >
                <div
                  key={`event-card-${displayEvent.id}`}
                  className="mx-auto max-w-md"
                  style={{
                    animation:
                      eventSwipeDirection === 0
                        ? 'none'
                        : `${eventSwipeDirection > 0 ? 'eventContentSlideInFromRight' : 'eventContentSlideInFromLeft'} 0.34s cubic-bezier(0.22,1,0.36,1)`,
                  }}
                >
                  <div
                    className="overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800"
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    {hasImages && (
                      <div
                        onTouchStart={handleEventPreviewTouchStart}
                        onTouchEnd={handleEventPreviewTouchEnd}
                        onClick={() => {
                          if (eventCardOpen) openLightboxAt(displayImageSlide)
                        }}
                        style={{
                          position: 'relative',
                          height: '100%',
                          width: '100%',
                          overflow: 'hidden',
                          cursor: eventCardOpen ? 'pointer' : 'default',
                          touchAction: eventCardOpen ? 'pan-y' : 'none',
                        }}
                      >
                        <div
                          key={`event-preview-images-${displayEvent.id}`}
                          style={{
                            display: 'flex',
                            height: '100%',
                            transform: `translateX(-${displayImageSlide * 100}%)`,
                            transition: 'transform 0.3s ease',
                            animation:
                              eventSwipeDirection === 0
                                ? 'none'
                                : `${eventSwipeDirection > 0 ? 'eventPreviewImageSlideInFromRight' : 'eventPreviewImageSlideInFromLeft'} 0.34s cubic-bezier(0.22,1,0.36,1)`,
                          }}
                        >
                          {displayImages.map((url, index) => (
                            <div
                              key={`${url}-${index}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                flexShrink: 0,
                              }}
                            >
                              <img
                                src={url}
                                alt=""
                                onLoad={() =>
                                  setLoadedEventPreviewImages((prev) => ({
                                    ...prev,
                                    [url]: true,
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                  opacity: loadedEventPreviewImages[url] ? 1 : 0,
                                  transition: 'opacity 0.28s ease',
                                }}
                                draggable={false}
                              />
                            </div>
                          ))}
                        </div>
                        {displayImages.length > 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              bottom: '10px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: '6px',
                              pointerEvents: eventCardOpen ? 'auto' : 'none',
                            }}
                          >
                            {displayImages.map((_, index) => (
                              <button
                                key={index}
                                type="button"
                                aria-label={`Show event image ${index + 1}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (eventCardOpen && displayEvent) {
                                    setSlide(displayEvent.id, index)
                                  }
                                }}
                                style={{
                                  width: index === displayImageSlide ? 8 : 6,
                                  height: index === displayImageSlide ? 8 : 6,
                                  borderRadius: '999px',
                                  border: 0,
                                  padding: 0,
                                  backgroundColor:
                                    index === displayImageSlide
                                      ? '#ffffff'
                                      : 'rgba(255,255,255,0.55)',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              예정된 이벤트가 없어요.
            </p>
          </div>
        )}
      </div>

      {eventListOpen && (
        <div
          className="fixed inset-0"
          style={{
            zIndex: 80,
            backgroundColor: eventListBg,
            opacity: eventListClosing ? 0 : 1,
            transition: 'opacity 0.22s ease',
          }}
          onClick={closeEventList}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              closeEventList()
            }}
            className="fixed flex h-11 w-11 items-center justify-center"
            aria-label="Close event list"
            style={{
              left: '14px',
              top: 'calc(env(safe-area-inset-top) + 6px)',
              zIndex: 90,
              color: eventListIconColor,
            }}
          >
            <List size={22} weight="bold" />
          </button>

          <div
            className="h-full overflow-y-auto px-6 pb-10"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto max-w-md space-y-3">
              {allEvents.map((ev) => {
                const parts = getListDateParts(ev)
                const selected = ev.id === displayEvent?.id
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => selectEventFromList(ev)}
                    className="w-full rounded-2xl border px-3 py-3 text-left"
                    style={{
                      ...eventListCardStyle,
                      borderColor: selected ? '#f97316' : eventListCardStyle.borderColor,
                    }}
                  >
                    <div className="flex items-center">
                      <div className="w-14 shrink-0 text-center">
                        <p className="text-xs font-semibold" style={{ color: eventListMutedColor }}>
                          {parts.month}
                        </p>
                        <p className="text-2xl font-semibold">{parts.day}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {ev.title || 'Untitled event'}
                        </p>
                        {ev.location && (
                          <p className="mt-1 truncate text-xs" style={{ color: eventListMutedColor }}>
                            {plainText(ev.location)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && detailImages.length > 0 && (
        <EventLightbox
          imgs={detailImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )

}
// Map Tab
function MapTab({ restaurants, member, isValid, isAdmin, authUserId }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState('전체')
  const [stampCardModalOpen, setStampCardModalOpen] = useState(false)
  const [stampCardSpot, setStampCardSpot] = useState(null)
  const [spotCardClosing, setSpotCardClosing] = useState(false)
  const [darkMode, setDarkMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    if (!selected) setStampCardModalOpen(false)
  }, [selected])

  const stampCardUserId = member?.user_id || authUserId
  const canSeeStampCard = isValid || isAdmin
  const stampCardEligible = !!(
    selected?.stamp_card_enabled &&
    canSeeStampCard &&
    stampCardUserId &&
    !spotCardClosing
  )

  useEffect(() => {
    if (stampCardEligible) setStampCardSpot(selected)
  }, [selected, stampCardEligible])

  useEffect(() => {
    setSpotCardClosing(false)
  }, [selected?.id])

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return undefined

    const syncDarkMode = () => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    }
    const observer = new MutationObserver(syncDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    syncDarkMode()

    return () => observer.disconnect()
  }, [])

  const filtered = useMemo(
    () =>
      activeCategory === '전체'
        ? restaurants
        : restaurants.filter((r) => r.category === activeCategory),
    [restaurants, activeCategory],
  )

  const visibleCategories = useMemo(
    () => getVisibleMapCategories(restaurants),
    [restaurants],
  )

  useEffect(() => {
    if (!visibleCategories.includes(activeCategory)) {
      setActiveCategory('전체')
    }
  }, [activeCategory, visibleCategories])

  return (
    <div
      className="h-full flex flex-col no-highlight-zone"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Category slider */}
<div 
  className="bg-white px-3 py-3 flex gap-2 overflow-x-auto flex-shrink-0 select-none dark:bg-[#121212]" 
  style={{ 
    paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
    zIndex: 10,  // Keep category slider above the map
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }} 
>
        {visibleCategories.map((cat) => {
          const isActive = activeCategory === cat
          const iconSvg = isActive
            ? darkMode
              ? CATEGORY_ICONS_BLACK[cat]
              : CATEGORY_ICONS_WHITE[cat]
            : CATEGORY_ICONS_ORANGE[cat]
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat)
                setSelected(null)
              }}
              className={
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 select-none ' +
                (isActive
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700')
              }
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
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

      <div
        className="flex-1 relative overflow-hidden"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <MapView
          restaurants={filtered}
          selected={selected}
          onSelect={setSelected}
        />
        {selected && (
          <SpotCard
            selected={selected}
            onClosingStart={() => setSpotCardClosing(true)}
            onClose={() => setSelected(null)}
          />
        )}

        {/* Stamp card mini widget ??fixed top-right, only for valid members */}
        {stampCardSpot && stampCardUserId && (
          <StampCardMini
            restaurantId={stampCardSpot.id}
            userId={stampCardUserId}
            open={stampCardEligible && stampCardSpot.id === selected?.id}
            onOpenModal={() => setStampCardModalOpen(true)}
            onExited={() => {
              if (!stampCardEligible) setStampCardSpot(null)
            }}
          />
        )}

        {/* Stamp card full modal */}
        {stampCardModalOpen && selected && stampCardUserId && (
          <StampCardModal
            restaurantId={selected.id}
            userId={stampCardUserId}
            onClose={() => setStampCardModalOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

if (typeof document !== 'undefined' && !document.getElementById('no-highlight-zone-style')) {
  const style = document.createElement('style')
  style.id = 'no-highlight-zone-style'
  style.textContent = `
    .no-highlight-zone,
    .no-highlight-zone * {
      -webkit-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
  `
  document.head.appendChild(style)
}
