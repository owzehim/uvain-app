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
  const [tabKey, setTabKey] = useState(0)
  const [events, setEvents] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const { token, secondsLeft } = useQRToken(member?.totp_secret)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: memberData } = await supabase.from('members').select('*').eq('user_id', user.id).single()
      const { data: adminData } = await supabase.from('admin_roles').select('id').eq('user_id', user.id).single()
      const { data: eventData } = await supabase.from('events').select('*').order('event_date', { ascending: true })
      const { data: restaurantData } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
      setMember(memberData)
      setIsAdmin(!!adminData)
      setEvents(eventData || [])
      setRestaurants(restaurantData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleTabChange = (key) => {
    setActiveTab(key)
    setTabKey(prev => prev + 1)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  )

  const qrValue = token ? window.location.origin + '/verify/' + token + '_' + member?.student_number : ''
  const isValid = member?.is_member && member?.membership_valid_until && new Date(member.membership_valid_until) >= new Date()

  return (
    <div className="flex flex-col bg-gray-50 overflow-hidden" style={{ height: '100dvh' }}>
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <h1 className="font-bold text-gray-900">UvA-IN</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => { window.location.href = '/admin' }} className="text-sm text-orange-500 font-medium px-3 py-1 rounded-lg hover:bg-orange-50">관리자</button>
          )}
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100">로그아웃</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div key={tabKey} className="animate-fade-slide-up h-full">
          {activeTab === 'qr' && <QRTab member={member} isValid={isValid} qrValue={qrValue} secondsLeft={secondsLeft} />}
          {activeTab === 'events' && <EventsTab events={events} />}
          {activeTab === 'map' && <MapTab restaurants={restaurants} />}
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 flex flex-shrink-0">
        {[
          { key: 'qr', label: 'MY', icon: '🪪' },
          { key: 'events', label: 'EVENT', icon: '📅' },
          { key: 'map', label: 'SPOT', icon: '🗺️' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={'flex-1 py-4 flex flex-col items-center gap-1 text-xs font-medium transition-colors ' + (activeTab === tab.key ? 'text-orange-500' : 'text-gray-400')}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function QRTab({ member, isValid, qrValue, secondsLeft }) {
  return (
    <div className="h-full overflow-y-auto pb-4">
      <div className="px-4 py-6 max-w-sm mx-auto space-y-4">
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
            <div className="p-3 bg-white rounded-xl border border-gray-100">
              <QRCodeSVG value={qrValue} size={200} level="M" />
            </div>
            <div className="w-full mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>QR 갱신까지</span>
                <span>{secondsLeft}초</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: (secondsLeft / 15 * 100) + '%' }} />
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
    </div>
  )
}

function EventsTab({ events }) {
  const [expandedId, setExpandedId] = useState(null)
  const [slideIndexes, setSlideIndexes] = useState({})

  const setSlide = (eventId, idx) => {
    setSlideIndexes(prev => ({ ...prev, [eventId]: idx }))
  }

  const addToCalendar = (ev) => {
    const start = new Date(ev.event_date)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const pad = n => String(n).padStart(2, '0')
    const fmt = d => d.getUTCFullYear() + '' + pad(d.getUTCMonth()+1) + '' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + '' + pad(d.getUTCMinutes()) + '00Z'
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
            <p className="text-sm text-orange-500 mt-1">
              {'📅 ' + new Date(ev.event_date).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {ev.location && <p className="text-sm text-gray-500 mt-0.5">{'📍 ' + ev.location}</p>}
        </button>

        {isExpanded && (
          <div className="animate-fade-slide-up">
            {imgs.length > 0 && (
              <div className="relative overflow-hidden">
                <div className="flex transition-transform duration-300" style={{ transform: 'translateX(-' + (currentSlide * 100) + '%)' }}>
                  {imgs.map((url, i) => (
                    <img key={i} src={url} alt={'이미지 ' + (i+1)} className="w-full flex-shrink-0 object-cover" style={{ aspectRatio: '1/1' }} />
                  ))}
                </div>
                {imgs.length > 1 && (
                  <div>
                    {currentSlide > 0 && (
                      <button onClick={() => setSlide(ev.id, currentSlide - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">‹</button>
                    )}
                    {currentSlide < imgs.length - 1 && (
                      <button onClick={() => setSlide(ev.id, currentSlide + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">›</button>
                    )}
                    <div className="absolute bottom-2 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-0.5 rounded-full">
                      {(currentSlide + 1) + '/' + imgs.length}
                    </div>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                      {imgs.map((_, i) => (
                        <button key={i} onClick={() => setSlide(ev.id, i)} className={'w-1.5 h-1.5 rounded-full ' + (i === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50')} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="px-5 pb-5">
              {ev.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{ev.description}</p>}
              <div className="flex gap-2 mt-3">
                {ev.event_date && (
                  <button onClick={() => addToCalendar(ev)} className="flex-1 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200">
                    📅 캘린더에 추가
                  </button>
                )}
                {instaUrl && (
                  <a href={instaUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 rounded-lg text-center">📸 Instagram에서 보기</a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pb-4">
      <div className="px-4 py-6 max-w-lg mx-auto">
        <h2 className="font-semibold text-gray-900 mb-4">EVENT</h2>
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

  const filtered = activeCategory === '전체' ? restaurants : restaurants.filter(r => r.category === activeCategory)

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSelected(null) }}
            className={'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ' + (activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            {categoryIcons[cat] + ' ' + cat}
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
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1">
            <MapView restaurants={filtered} selected={selected} onSelect={setSelected} />
          </div>
          {selected && (
  <div className="bg-white border-t border-gray-100 p-4 flex-shrink-0">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2 flex-wrap flex-1">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {categoryIcons[selected.category] + ' ' + (selected.category || '맛집')}
        </span>
        {selected.price_range && (
          <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{selected.price_range}</span>
        )}
      </div>
      <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 ml-3 text-lg flex-shrink-0 leading-none">✕</button>
    </div>
    <p className="font-semibold text-gray-900 text-sm">{selected.name}</p>
    {selected.address && <p className="text-xs text-gray-500 mt-1">{'📍 ' + selected.address}</p>}
    {selected.discount_info && <p className="text-xs text-orange-500 mt-1">{'🎟 ' + selected.discount_info}</p>}
    {selected.rating > 0 && <p className="text-xs text-amber-500 mt-1">{'★'.repeat(Math.round(selected.rating)) + ' ' + selected.rating}</p>}
    {selected.review && <p className="text-xs text-gray-600 mt-1">{selected.review}</p>}
    {selected.reviewer_name && <p className="text-xs text-gray-400 mt-0.5">{'— ' + selected.reviewer_name}</p>}
    <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selected.name + ' ' + (selected.address || ''))} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 bg-orange-500 text-white text-xs px-4 py-2 rounded-lg hover:bg-orange-600">Google Maps에서 열기</a>
  </div>
)}
        </div>
      )}
    </div>
  )
}