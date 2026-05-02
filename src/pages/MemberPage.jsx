import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQRToken } from '../hooks/useQRToken'
import { QRCodeSVG } from 'qrcode.react'
import MapView from '../components/MapView'

export default function MemberPage() {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('qr')
  const [events, setEvents] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const { token, secondsLeft } = useQRToken(member?.totp_secret)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: memberData } = await supabase
        .from('members').select('*').eq('user_id', user.id).single()
      const { data: adminData } = await supabase
        .from('admin_roles').select('id').eq('user_id', user.id).single()
      const { data: eventData } = await supabase
        .from('events').select('*').order('event_date', { ascending: true })
      const { data: restaurantData } = await supabase
        .from('restaurants').select('*').order('created_at', { ascending: false })
      setMember(memberData)
      setIsAdmin(!!adminData)
      setEvents(eventData || [])
      setRestaurants(restaurantData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  )

  const qrValue = token
    ? `${window.location.origin}/verify/${token}_${member?.student_number}`
    : ''

  const isValid = member?.is_member &&
    member?.membership_valid_until &&
    new Date(member.membership_valid_until) >= new Date()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-gray-900">UvA-IN</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => window.location.href = '/admin'}
              className="text-sm text-blue-600 font-medium px-3 py-1 rounded-lg hover:bg-blue-50"
            >
              관리자
            </button>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
        {[
          { key: 'qr', label: 'MY', icon: '🪪' },
          { key: 'events', label: 'EVENT', icon: '📅' },
          { key: 'map', label: 'SPOT', icon: '🗺️' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
              activeTab === tab.key ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pb-20">
        {activeTab === 'qr' && (
          <QRTab member={member} isValid={isValid} qrValue={qrValue} secondsLeft={secondsLeft} />
        )}
        {activeTab === 'events' && <EventsTab events={events} />}
        {activeTab === 'map' && <MapTab restaurants={restaurants} />}
      </div>
    </div>
  )
}

function QRTab({ member, isValid, qrValue, secondsLeft }) {
  return (
    <div className="px-4 py-6 max-w-sm mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">{member?.full_name}</h2>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {isValid ? '✓ 유효' : '✗ 만료'}
          </span>
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <p>학번: {member?.student_number}</p>
          <p>전공: {member?.major}</p>
          <p>유효기간: {member?.membership_valid_until ?? '없음'}</p>
        </div>
      </div>

      {isValid ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-4">멤버십 QR 코드</p>
          <div className="p-3 bg-white rounded-xl border border-gray-100">
            <QRCodeSVG value={qrValue} size={200} level="M" />
          </div>
          <div className="w-full mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>QR 갱신까지</span>
              <span>{secondsLeft}초</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(secondsLeft / 15) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">15초마다 자동 갱신됩니다</p>
        </div>
      ) : (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-5 text-center">
          <p className="text-red-600 font-medium">멤버십이 유효하지 않습니다</p>
          <p className="text-sm text-red-400 mt-1">임원에게 문의하세요</p>
        </div>
      )}
    </div>
  )
}

function EventsTab({ events }) {
  const [expanded, setExpanded] = useState(null)

  const addToCalendar = (ev) => {
    const start = new Date(ev.event_date)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const pad = n => String(n).padStart(2, '0')
    const fmt = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:' + fmt(start),
      'DTEND:' + fmt(end),
      'SUMMARY:' + ev.title,
      'DESCRIPTION:' + (ev.description || ''),
      'LOCATION:' + (ev.location || ''),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n')
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = ev.title + '.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderEvent = (ev) => {
    const instaUrl = ev['instagram_url']
    const imgUrl = ev['image_url']
    const isExpanded = expanded === ev.id

    return (
      <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {imgUrl && (
          <div className="cursor-pointer" onClick={() => setExpanded(isExpanded ? null : ev.id)}>
            <img
              src={imgUrl}
              alt={ev.title}
              className={'w-full object-cover transition-all duration-300 ' + (isExpanded ? 'h-72' : 'h-40')}
            />
          </div>
        )}
        <div className="p-5">
          <p className="font-semibold text-gray-900">{ev.title}</p>
          {ev.event_date && (
            <p className="text-sm text-blue-600 mt-1">
              {'📅 ' + new Date(ev.event_date).toLocaleString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
          {ev.location && <p className="text-sm text-gray-500 mt-1">{'📍 ' + ev.location}</p>}
          {ev.description && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{ev.description}</p>}
          <div className="flex gap-2 mt-3">
            {ev.event_date && (
              <button
                onClick={() => addToCalendar(ev)}
                className="flex-1 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200"
              >
                📅 캘린더에 추가
              </button>
            )}
            {instaUrl && (
              
                <a href={instaUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 rounded-lg text-center">📸 인스타그램</a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h2 className="font-semibold text-gray-900 mb-4">이벤트</h2>
      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-gray-500 text-sm">예정된 이벤트가 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => renderEvent(ev))}
        </div>
      )}
    </div>
  )
}

function MapTab({ restaurants }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState('전체')

  const categories = ['전체', '맛집', '미용실', '헬스장', '한국마트', '카페', '기타']
  const categoryIcons = {
    '맛집': '🍽️', '미용실': '💇', '헬스장': '💪',
    '한국마트': '🛒', '카페': '☕', '기타': '📍', '전체': '🗺️'
  }

  const filtered = activeCategory === '전체'
    ? restaurants
    : restaurants.filter(r => r.category === activeCategory)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 64px)' }}>
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSelected(null) }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {categoryIcons[cat]} {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl mb-2">{categoryIcons[activeCategory]}</p>
            <p className="text-gray-500 text-sm">등록된 장소가 없어요</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1">
            <MapView restaurants={filtered} selected={selected} onSelect={setSelected} />
          </div>
          {selected && (
            <div className="bg-white border-t border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {categoryIcons[selected.category]} {selected.category || '맛집'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 mt-1">{selected.name}</p>
                  {selected.address && (
                    <p className="text-sm text-gray-500 mt-0.5">📍 {selected.address}</p>
                  )}
                  {selected.discount_info && (
                    <p className="text-sm text-blue-600 mt-0.5">🎟 {selected.discount_info}</p>
                  )}
                  {selected.rating > 0 && (
                    <p className="text-sm text-amber-500 mt-0.5">
                      {'★'.repeat(Math.round(selected.rating))} {selected.rating}
                    </p>
                  )}
                  {selected.review && (
                    <p className="text-sm text-gray-600 mt-1">{selected.review}</p>
                  )}
                  {selected.reviewer_name && (
                    <p className="text-xs text-gray-400 mt-0.5">— {selected.reviewer_name}</p>
                  )}
                  
                    <a href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700">Google Maps에서 열기</a>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 ml-4 text-lg">
                  ✕
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}