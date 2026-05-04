import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'

// Shared RichText renderer
function RichText({ text, className = '' }) {
  if (!text) return null
  const parts = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[color:([^\]]+)\](.+?)\[\/color\]/g
  let last = 0, m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={last}>{text.slice(last, m.index)}</span>)
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>)
    else if (m[2]) parts.push(<em key={m.index}>{m[2]}</em>)
    else if (m[3]) parts.push(<span key={m.index} style={{ color: m[3] }}>{m[4]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>)
  return <span className={className}>{parts.length ? parts : text}</span>
}

export default function PublicPage() {
  const [activeTab, setActiveTab] = useState('map')
  const [restaurants, setRestaurants] = useState([])
  const navigate = useNavigate()
  const TAB_ORDER = ['map', 'membership']
  const swipeStartX = useRef(null)
  const swipeStartY = useRef(null)

  useEffect(() => {
    const fetchRestaurants = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })
      setRestaurants(data || [])
    }
    fetchRestaurants()
  }, [])

  const handleSwipeStart = (e) => {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }
  const handleSwipeEnd = (e) => {
    if (swipeStartX.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY.current)
    swipeStartX.current = null
    if (Math.abs(dx) < 60 || dy > 80) return
    const idx = TAB_ORDER.indexOf(activeTab)
    if (dx < 0 && idx < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[idx + 1])
    if (dx > 0 && idx > 0) setActiveTab(TAB_ORDER[idx - 1])
  }

  return (
    <div className="flex flex-col bg-gray-50 overflow-hidden" style={{ height: '100dvh' }}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <h1 className="font-bold text-gray-900">UvA-IN</h1>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-orange-500 font-medium px-3 py-1 rounded-lg hover:bg-orange-50"
        >
          로그인
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'map' && <PublicMapTab restaurants={restaurants} />}
        {activeTab === 'membership' && <MembershipTab />}
      </div>

      {/* 하단 탭 */}
      <div className="bg-white border-t border-gray-100 flex flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        {[
          { key: 'map', label: 'SPOT', icon: '🗺️' },
          { key: 'membership', label: 'Membership', icon: '🔒' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={'flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ' + (activeTab === tab.key ? 'text-orange-500' : 'text-gray-400')}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Shared SpotCard (same as MemberPage but standalone)
function SpotCard({ selected, onClose }) {
  const [cardHeight, setCardHeight] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [closing, setClosing] = useState(false)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const lastYRef = useRef(0)
  const cardRef = useRef(null)
  const imgs = selected['image_urls'] || []
  const hasImages = imgs.length > 0
  const categoryIcons = { '맛집': '🍽️', '카페': '☕', '마트': '🛒', '도서관': '📚', '학교': '🎓', '기타': '📍' }
  const WIN_H = typeof window !== 'undefined' ? window.innerHeight : 700
  const MIN_HEIGHT = Math.min(WIN_H * 0.38, 260)
  const MAX_HEIGHT = WIN_H * 0.88

  useEffect(() => { setCardHeight(MIN_HEIGHT); setSlideIndex(0); setClosing(false) }, [selected])

  const triggerClose = () => { setClosing(true); setTimeout(() => onClose(), 320) }

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY
    lastYRef.current = e.touches[0].clientY
    startHeightRef.current = hasImages ? cardHeight : (cardRef.current?.offsetHeight || MIN_HEIGHT)
    setIsDragging(true)
  }
  const handleTouchMove = (e) => {
    if (!isDragging) return
    lastYRef.current = e.touches[0].clientY
    const delta = startYRef.current - e.touches[0].clientY
    if (!hasImages && delta > 0) return
    if (hasImages) setCardHeight(Math.min(MAX_HEIGHT, Math.max(0, startHeightRef.current + delta)))
  }
  const handleTouchEnd = () => {
    setIsDragging(false)
    const delta = startYRef.current - lastYRef.current
    const startH = startHeightRef.current
    if (!hasImages) { if (delta < -40) triggerClose(); return }
    if (delta > 40) setCardHeight(MAX_HEIGHT)
    else if (delta < -40) { if (startH >= MAX_HEIGHT * 0.85) setCardHeight(MIN_HEIGHT); else triggerClose() }
    else setCardHeight(startH >= (MIN_HEIGHT + MAX_HEIGHT) / 2 ? MAX_HEIGHT : MIN_HEIGHT)
  }
  const isMax = cardHeight >= MAX_HEIGHT * 0.85
  const noImageStyle = { transform: closing ? 'translateY(110%)' : 'translateY(0)', transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0,0.67,0)', height: 'auto' }
  const imageStyle = { height: cardHeight + 'px', transform: closing ? 'translateY(110%)' : 'translateY(0)', transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.32,0,0.67,0)' }

  return (
    <div ref={cardRef} className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl"
      style={{ ...(hasImages ? imageStyle : noImageStyle), zIndex: 1000, boxShadow: '0 -4px 24px rgba(0,0,0,0.13)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-center pt-2.5 pb-2 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      <div className="flex-1" style={{ overflowY: isMax ? 'auto' : 'hidden' }}>
        <div className="px-4 pt-1 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{(categoryIcons[selected.category] || '📍') + ' ' + (selected.category || '기타')}</span>
            {selected.price_range && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{selected.price_range}</span>}
            {selected.is_sponsored && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">제휴</span>}
          </div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{selected.name}</p>
            {selected.rating > 0 && <p className="text-xs text-amber-500">{'★'.repeat(Math.round(selected.rating)) + ' ' + selected.rating}</p>}
          </div>
          {selected.description && <RichText text={selected.description} className="text-xs text-gray-500 mt-1 block" />}
          {selected.address && <p className="text-xs text-gray-500 mt-1">{'📍 ' + selected.address}</p>}
          {selected.discount_info && <p className="text-xs text-orange-500 mt-1">{'🎟 ' + selected.discount_info}</p>}
          {selected.discount_terms && <p className="text-xs text-gray-400 mt-0.5">{'※ ' + selected.discount_terms}</p>}
          {(selected.review || selected.reviewer_name) && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              {selected.review && <RichText text={selected.review} className="text-xs text-gray-600 block" />}
              {selected.reviewer_name && <p className="text-xs text-gray-400 mt-0.5">{'— ' + selected.reviewer_name}</p>}
            </div>
          )}
        </div>
        {!hasImages && <div className="pb-16" />}
        {hasImages && (
          <div className="px-4 pb-6">
            <div className="relative overflow-hidden rounded-xl">
              <div className="flex" style={{ transform: 'translateX(-' + (slideIndex * 100) + '%)', transition: 'transform 0.3s ease' }}>
                {imgs.map((url, i) => (
                  <div key={i} className="w-full flex-shrink-0">
                    <img src={url} alt={'사진 ' + (i + 1)} style={{ width: '100%', height: 'auto', display: 'block' }} draggable={false} />
                  </div>
                ))}
              </div>
              {imgs.length > 1 && (
                <>
                  {slideIndex > 0 && <button onTouchEnd={e => { e.stopPropagation(); setSlideIndex(slideIndex - 1) }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-8 h-8 flex items-center justify-center">‹</button>}
                  {slideIndex < imgs.length - 1 && <button onTouchEnd={e => { e.stopPropagation(); setSlideIndex(slideIndex + 1) }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-8 h-8 flex items-center justify-center">›</button>}
                  <div className="absolute bottom-2 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-0.5 rounded-full">{(slideIndex + 1) + '/' + imgs.length}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '72px', background: isMax ? 'transparent' : 'linear-gradient(to bottom, transparent, white)', zIndex: 10 }}>
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selected.name + ' ' + (selected.address || ''))} target="_blank" rel="noopener noreferrer"
            className="pointer-events-auto bg-orange-500 text-white text-xs font-medium px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2"
            onTouchStart={e => e.stopPropagation()}>
            🗺️ Google Maps에서 열기
          </a>
        </div>
      </div>
    </div>
  )
}

function PublicMapTab({ restaurants }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState('전체')

  const categories = ['전체', '맛집', '카페', '마트', '도서관', '학교', '기타']
  const categoryIcons = {
    '맛집': '🍽️', '카페': '☕', '마트': '🛒',
    '도서관': '📚', '학교': '🎓', '기타': '📍', '전체': '🗺️'
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
        <div className="flex-1 relative overflow-hidden">
          <MapView restaurants={filtered} selected={selected} onSelect={setSelected} />
          {selected && <SpotCard selected={selected} onClose={() => setSelected(null)} />}
        </div>
      )}
    </div>
  )
}

function MembershipTab() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-8 max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">UvA-IN Membership</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            UvA-IN 멤버십에 가입하고 다양한 혜택을 누리세요!
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <span className="text-2xl">🍽️</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">제휴 레스토랑 / 카페 할인</p>
              <p className="text-xs text-gray-500 mt-0.5">암스테르담 내 제휴 장소에서 멤버십 할인 혜택</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">학생회 이벤트 우선 참가</p>
              <p className="text-xs text-gray-500 mt-0.5">이벤트 참가비 무료 및 할인 혜택</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <span className="text-2xl">🤝</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">UvA 한인 네트워크</p>
              <p className="text-xs text-gray-500 mt-0.5">암스테르담 한인 학생 커뮤니티 참여</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full bg-orange-500 text-white font-semibold py-3 rounded-2xl hover:bg-orange-600 transition-colors"
        >
          로그인 / 가입하기
        </button>
      </div>
    </div>
  )
}