import { useEffect, useRef, useState } from 'react'

export function RichText({ text, className = '' }) {
  if (!text) return null
  return <span className={className} dangerouslySetInnerHTML={{ __html: text }} />
}

const categoryIcons = {
  '맛집': '🍽️', '카페': '☕', '마트': '🛒',
  '운동': '💪', '미용/뷰티': '💇', '기타': '📍',
  '스터디': '📚', '학교': '🎓', '의료': '🏥',
  '쇼핑': '🛍️', '여가': '🎮'
}

export function SpotCard({ selected, onClose }) {
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

  const WIN_H = typeof window !== 'undefined' ? window.innerHeight : 700
  const MIN_HEIGHT = Math.min(WIN_H * 0.38, 260)
  const MAX_HEIGHT = WIN_H * 0.88

  useEffect(() => { setCardHeight(MIN_HEIGHT); setSlideIndex(0); setClosing(false) }, [selected])

  const triggerClose = () => { setClosing(true); setTimeout(() => onClose(), 320) }
  const snapTo = (height) => setCardHeight(height)

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
    if (hasImages) { const newHeight = Math.min(MAX_HEIGHT, Math.max(0, startHeightRef.current + delta)); setCardHeight(newHeight) }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    const delta = startYRef.current - lastYRef.current
    const startH = startHeightRef.current
    const wasMax = startH >= MAX_HEIGHT * 0.85
    const wasMin = startH <= MIN_HEIGHT * 1.15
    if (!hasImages) { if (delta < -40) triggerClose(); return }
    if (delta > 40) { snapTo(MAX_HEIGHT) }
    else if (delta < -40) { if (wasMax) snapTo(MIN_HEIGHT); else if (wasMin) triggerClose(); else snapTo(MIN_HEIGHT) }
    else { const mid = (MIN_HEIGHT + MAX_HEIGHT) / 2; snapTo(startH >= mid ? MAX_HEIGHT : MIN_HEIGHT) }
  }

  const isMax = cardHeight >= MAX_HEIGHT * 0.85

  const noImageStyle = { transform: closing ? 'translateY(110%)' : 'translateY(0)', transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0,0.67,0)', height: 'auto' }
  const imageStyle = { height: cardHeight + 'px', transform: closing ? 'translateY(110%)' : 'translateY(0)', transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.32,0,0.67,0)' }

  return (
    <div ref={cardRef} className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl"
      style={{ ...(hasImages ? imageStyle : noImageStyle), zIndex: 1000, boxShadow: '0 -4px 24px rgba(0,0,0,0.13)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      onWheel={e => {
        if (!hasImages) return
        const delta = e.deltaY
        if (delta < 0) snapTo(MAX_HEIGHT)
        else if (delta > 0) {
          if (cardHeight >= MAX_HEIGHT * 0.85) snapTo(MIN_HEIGHT)
          else triggerClose()
        }
      }}>
      <div className="flex justify-center pt-2.5 pb-2 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      <div className="flex-1" style={{ overflowY: isMax ? 'auto' : 'hidden' }}>
        <div className="px-4 pt-1 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {(categoryIcons[selected.category] || '📍') + ' ' + (selected.category || '기타')}
            </span>
            {selected.price_range && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{selected.price_range}</span>}
            {selected.is_sponsored && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">제휴</span>}
          </div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{selected.name}</p>
            {selected.rating > 0 && <p className="text-xs text-amber-500">{'★'.repeat(Math.round(selected.rating)) + ' ' + selected.rating}</p>}
          </div>
          {selected.description && <RichText text={selected.description} className="text-xs text-gray-500 mt-1 block" />}
          {selected.address && <p className="text-xs text-gray-500 mt-1">{'📍 ' + selected.address}</p>}
          {selected.discount_info && <p className="text-xs text-orange-500 mt-1">🎟 <RichText text={selected.discount_info} /></p>}
          {selected.discount_terms && <p className="text-xs text-gray-400 mt-0.5">※ <RichText text={selected.discount_terms} /></p>}
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
                    <img src={url} alt={'사진 ' + (i + 1)} style={{ width: '100%', height: 'auto', maxHeight: '220px', objectFit: 'cover', display: 'block' }} draggable={false} />
                  </div>
                ))}
              </div>
              {imgs.length > 1 && (
                <>
                  {slideIndex > 0 && <button onTouchEnd={e => { e.stopPropagation(); setSlideIndex(slideIndex - 1) }} onClick={() => setSlideIndex(slideIndex - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-8 h-8 flex items-center justify-center">{'‹'}</button>}
                  {slideIndex < imgs.length - 1 && <button onTouchEnd={e => { e.stopPropagation(); setSlideIndex(slideIndex + 1) }} onClick={() => setSlideIndex(slideIndex + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-8 h-8 flex items-center justify-center">{'›'}</button>}
                  <div className="absolute bottom-2 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-0.5 rounded-full">{(slideIndex + 1) + '/' + imgs.length}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '72px', background: isMax ? 'transparent' : 'linear-gradient(to bottom, transparent, white)', zIndex: 10 }}>
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selected.name + ' ' + (selected.address || ''))}
            target="_blank" rel="noopener noreferrer"
            className="pointer-events-auto bg-orange-500 text-white text-xs font-medium px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2"
            onTouchStart={e => e.stopPropagation()}>
            🗺️ Google Maps에서 열기
          </a>
        </div>
      </div>
    </div>
  )
}