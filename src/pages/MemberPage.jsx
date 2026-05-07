import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useQRToken } from '../hooks/useQRToken'
import { QRCodeSVG } from 'qrcode.react'
import MapView from '../components/MapView'
import { SpotCard, RichText } from '../components/SpotCard'
import { broadcastQRExpiry } from '../lib/qrSync'
import { MAP_CATEGORIES, CATEGORY_ICONS_WHITE, CATEGORY_ICONS_ORANGE } from '../lib/mapCategories'
import { QrCode, Calendar, MapPin } from '@phosphor-icons/react'

export default function MemberPage() {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('qr')
  const [tabKey, setTabKey] = useState(0)
  const [events, setEvents] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const { token, secondsLeft } = useQRToken(member?.totp_secret)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single()
      const { data: adminData } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })
      setMember(memberData)
      setIsAdmin(!!adminData)
      setEvents(eventData || [])
      setRestaurants(restaurantData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

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

  const qrValue = token ? window.location.origin + '/verify/' + token + '_' + member?.student_number : ''
  const isValid = member?.is_member && member?.membership_valid_until && new Date(member.membership_valid_until) >= new Date()

  return (
    <div className="flex flex-col bg-gray-50 overflow-hidden" style={{ height: '100dvh' }}>
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <h1 className="font-bold text-gray-900">UvA-IN</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => { window.location.href = '/admin' }} className="text-sm text-white font-medium px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700">
              관리자
            </button>
          )}
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100">
            로그아웃
          </button>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        <div key={tabKey} className="h-full animate-quick-fade-slide-up">
          {activeTab === 'qr' && (
            <QRTab member={member} isValid={isValid} qrValue={qrValue} secondsLeft={secondsLeft} />
          )}
          {activeTab === 'events' && <EventsTab events={events} />}
          {activeTab === 'map' && <MapTab restaurants={restaurants} />}
        </div>
      </div>

      {/* 하단 탭 */}
      <div className="bg-white border-t border-gray-100 flex flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        {[
          { key: 'qr', label: 'MY', icon: QrCode },
          { key: 'events', label: 'EVENTS', icon: Calendar },
          { key: 'map', label: 'SPOT', icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)} className={'flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ' + (activeTab === tab.key ? 'text-orange-500' : 'text-gray-400')}>
              <Icon size={20} weight={activeTab === tab.key ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function QRTab({ member, isValid, qrValue, secondsLeft }) {
  useEffect(() => {
    if (!member?.student_number) return
    broadcastQRExpiry(member.student_number)
  }, [qrValue, member?.student_number])

  const totalSeconds = 15
  const progressPercent = ((secondsLeft || 0) / totalSeconds) * 100
  const displaySeconds = secondsLeft !== null && secondsLeft !== undefined ? secondsLeft : 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">{member?.full_name}</h2>
            <span className={'text-xs font-medium px-2 py-1 rounded-full ' + (isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
              {isValid ? '✓ 유효' : '✗ 만료'}
            </span>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>{'학번: ' + member?.student_number}</p>
            <p>{'전공: ' + member?.major}</p>
            <p>{'유효기간: ' + (member?.membership_valid_until ?? '없음')}</p>
          </div>
        </div>
        {isValid ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-4">멤버십 QR 코드</p>
            <div className="p-3 bg-white rounded-xl border-4 border-orange-500">
              <QRCodeSVG value={qrValue} size={200} level="M" />
            </div>
            <div className="w-full mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">QR 갱신까지</p>
                <p className="text-sm font-semibold text-gray-700">{displaySeconds}초</p>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-100" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">15초마다 자동 갱신됩니다</p>
          </div>
        ) : (
          <div className="bg-red-50 rounded-2xl border border-red-100 p-5 text-center">
            <p className="text-red-600 font-medium">멤버십이 유효하지 않습니다</p>
            <p className="text-sm text-red-400 mt-1">임원에게 문의하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

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
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(30,30,30,0.92)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(30,30,30,0.7)')}
    >
      {children}
    </button>
  )
}
function EventsTab({ events }) {
  const [expandedId, setExpandedId] = useState(null)
  const [slideIndexes, setSlideIndexes] = useState({})
  const [pastEventsExpanded, setPastEventsExpanded] = useState(false)

  const setSlide = (eventId, idx) => setSlideIndexes((prev) => ({ ...prev, [eventId]: idx }))

  useEffect(() => {
    if (!expandedId) return
    const ev = events.find((e) => e.id === expandedId)
    if (!ev) return
    const imgs = ev['image_urls'] || []
    if (imgs.length <= 1) return
    const handler = (e) => {
      if (e.key === 'ArrowRight') {
        setSlide(expandedId, Math.min((slideIndexes[expandedId] || 0) + 1, imgs.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setSlide(expandedId, Math.max((slideIndexes[expandedId] || 0) - 1, 0))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expandedId, slideIndexes, events])

  const addToCalendar = (ev) => {
    const start = new Date(ev.event_date)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const pad = (n) => String(n).padStart(2, '0')
    const fmt = (d) => d.getUTCFullYear() + '' + pad(d.getUTCMonth() + 1) + '' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + '' + pad(d.getUTCMinutes()) + '00Z'
    const ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:' + fmt(start) + '\nDTEND:' + fmt(end) + '\nSUMMARY:' + ev.title + '\nLOCATION:' + (ev.location || '') + '\nDESCRIPTION:' + (ev.description || '') + '\nEND:VEVENT\nEND:VCALENDAR'
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
      <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button onClick={() => setExpandedId(isExpanded ? null : ev.id)} className="w-full text-left p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">{ev.title}</p>
            <span className="text-gray-400 text-sm ml-2">{isExpanded ? '▲' : '▼'}</span>
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
                {/* 모바일 슬라이더 */}
                <div
                  className="md:hidden"
                  onTouchStart={(e) => { e.currentTarget._swipeStartX = e.touches[0].clientX }}
                  onTouchEnd={(e) => {
                    const start = e.currentTarget._swipeStartX
                    if (start == null) return
                    const dx = e.changedTouches[0].clientX - start
                    e.currentTarget._swipeStartX = null
                    if (dx < -40 && currentSlide < imgs.length - 1) {
                      setSlide(ev.id, currentSlide + 1)
                    } else if (dx > 40 && currentSlide > 0) {
                      setSlide(ev.id, currentSlide - 1)
                    }
                  }}
                >
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '1/1' }}>
                    <div className="flex h-full" style={{ transform: 'translateX(-' + currentSlide * 100 + '%)', transition: 'transform 0.3s ease' }}>
                      {imgs.map((url, i) => (
                        <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-100">
                          <img src={url} alt={'이미지 ' + (i + 1)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} draggable={false} />
                        </div>
                      ))}
                    </div>
                    {imgs.length > 1 && (
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                        {imgs.map((_, i) => (
                          <div key={i} onClick={() => setSlide(ev.id, i)} className={'rounded-full cursor-pointer transition-all ' + (i === currentSlide ? 'bg-white w-2 h-2' : 'bg-white bg-opacity-50 w-1.5 h-1.5')} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 데스크톱 슬라이더 */}
                <div className="hidden md:block">
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '1/1' }}>
                    <div className="flex h-full" style={{ transform: 'translateX(-' + currentSlide * 100 + '%)', transition: 'transform 0.3s ease' }}>
                      {imgs.map((url, i) => (
                        <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-100">
                          <img src={url} alt={'이미지 ' + (i + 1)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} draggable={false} />
                        </div>
                      ))}
                    </div>
                    {imgs.length > 1 && (
                      <>
                        {currentSlide > 0 && (
                          <NavBtn onClick={() => setSlide(ev.id, currentSlide - 1)} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                            ‹
                          </NavBtn>
                        )}
                        {currentSlide < imgs.length - 1 && (
                          <NavBtn onClick={() => setSlide(ev.id, currentSlide + 1)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                            ›
                          </NavBtn>
                        )}
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                          {imgs.map((_, i) => (
                            <div key={i} onClick={() => setSlide(ev.id, i)} className={'rounded-full cursor-pointer transition-all ' + (i === currentSlide ? 'bg-white w-2 h-2' : 'bg-white bg-opacity-50 w-1.5 h-1.5')} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="px-5 pb-5">
              {ev.description && <RichText text={ev.description} className="text-sm text-gray-600 mt-3 leading-relaxed block" />}
              <div className="flex gap-2 mt-3">
                {ev.event_date && (
                  <button onClick={() => addToCalendar(ev)} className="flex-1 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1.5">
                    <Calendar size={14} weight="fill" />
                    캘린더에 추가
                  </button>
                )}
                {instaUrl && (
                  <a href={instaUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-center flex items-center justify-center gap-1.5 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
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
  const upcomingEvents = events.filter((ev) => ev.event_date && new Date(ev.event_date) >= now)
  const pastEvents = events.filter((ev) => ev.event_date && new Date(ev.event_date) < now)

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
            {/* UPCOMING EVENTS */}
            {upcomingEvents.length > 0 && (
              <div>
                {(() => {
                  let currentMonth = null
                  const blocks = []
                  upcomingEvents.forEach((ev) => {
                    const label = ev.event_date ? `${new Date(ev.event_date).getMonth() + 1}월` : '날짜 미정'
                    if (label !== currentMonth) {
                      currentMonth = label
                      blocks.push(<p key={`month-${label}`} className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">{label}</p>)
                    }
                    blocks.push(renderEvent(ev))
                  })
                  return blocks
                })()}
              </div>
            )}

            {/* PAST EVENTS SECTION */}
            {pastEvents.length > 0 && (
              <div className="mt-6">
                <button onClick={() => setPastEventsExpanded(!pastEventsExpanded)} className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-semibold">지난 이벤트</span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium">{pastEvents.length}</span>
                  </div>
                  <span className="text-gray-400 text-lg">{pastEventsExpanded ? '▲' : '▼'}</span>
                </button>
                {pastEventsExpanded && (
                  <div className="space-y-3 mt-3">
                    {(() => {
                      let currentMonth = null
                      const blocks = []
                      pastEvents.forEach((ev) => {
                        const label = ev.event_date ? `${new Date(ev.event_date).getMonth() + 1}월` : '날짜 미정'
                        if (label !== currentMonth) {
                          currentMonth = label
                          blocks.push(<p key={`past-month-${label}`} className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">{label}</p>)
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

function MapTab({ restaurants }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState('전체')

  // ✅ NEW: useMemo to prevent unnecessary filtering
  const filtered = useMemo(
    () =>
      activeCategory === '전체'
        ? restaurants
        : restaurants.filter((r) => r.category === activeCategory),
    [restaurants, activeCategory]
  )

  return (
    <div className="h-full flex flex-col">
      {/* 카테고리 바 */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
        {MAP_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat
          // ✅ NEW: Use pre-computed icon variants instead of calling getMapIconSvg
          const iconSvg = isActive ? CATEGORY_ICONS_WHITE[cat] : CATEGORY_ICONS_ORANGE[cat]
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat)
                setSelected(null)
              }}
              className={
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ' +
                (isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
            >
              <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: iconSvg }} />
              {cat}
            </button>
          )
        })}
      </div>

      {/* 지도 */}
      <div className="flex-1 relative overflow-hidden">
        <MapView restaurants={filtered} selected={selected} onSelect={setSelected} />
        {selected && <SpotCard selected={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}
