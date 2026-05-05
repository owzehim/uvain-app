import { useEffect, useRef, useState } from 'react'
import { MapPin, ForkKnife, Coffee, ShoppingCart, Books, GraduationCap, FirstAid, Barbell, Sparkle, GameController, ShoppingBag } from 'phosphor-react'

export function RichText({ text, className = '' }) {
  if (!text) return null
  return <span className={className} dangerouslySetInnerHTML={{ __html: text }} />
}

const categoryIcons = {
  '맛집': ForkKnife,
  '카페': Coffee,
  '마트': ShoppingCart,
  '운동': Barbell,
  '미용/뷰티': Sparkle,
  '기타': MapPin,
  '스터디': Books,
  '학교': GraduationCap,
  '의료': FirstAid,
  '쇼핑': ShoppingBag,
  '여가': GameController
}

function Lightbox({ imgs, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, imgs.length - 1))
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [imgs.length, onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '999px', width: '36px', height: '36px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>×</button>

      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); setIndex(i => i - 1) }} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '999px', width: '44px', height: '44px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>‹</button>
      )}

      <img src={imgs[index]} alt={'사진 ' + (index + 1)} onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} />

      {index < imgs.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIndex(i => i + 1) }} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '999px', width: '44px', height: '44px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>›</button>
      )}

      {imgs.length > 1 && (
        <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
          {imgs.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); setIndex(i) }} style={{ width: i === index ? '8px' : '6px', height: i === index ? '8px' : '6px', borderRadius: '999px', background: i === index ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SpotCard({ selected, onClose }) {
  const [cardHeight, setCardHeight] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [closing, setClosing] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const lastYRef = useRef(0)
  const cardRef = useRef(null)

  const imgs = selected['image_urls'] || []
  const hasImages = imgs.length > 0
  const WIN_H = typeof window !== 'undefined' ? window.innerHeight : 700
  const WIN_W = typeof window !== 'undefined' ? window.innerWidth : 1024
  const isDesktop = WIN_W >= 768
  const MIN_HEIGHT = Math.min(WIN_H * 0.38, 260)
  const MAX_HEIGHT = isDesktop ? 460 : WIN_H * 0.88

  useEffect(() => {
    setCardHeight(MIN_HEIGHT)
    setSlideIndex(0)
    setClosing(false)
  }, [selected])

  const triggerClose = () => {
    setClosing(true)
    setTimeout(() => onClose(), 320)
  }

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
    if (hasImages) {
      const newHeight = Math.min(MAX_HEIGHT, Math.max(0, startHeightRef.current + delta))
      setCardHeight(newHeight)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    const delta = startYRef.current - lastYRef.current
    const startH = startHeightRef.current
    const wasMax = startH >= MAX_HEIGHT * 0.85
    const wasMin = startH <= MIN_HEIGHT * 1.15

    if (!hasImages) {
      if (delta < -40) triggerClose()
      return
    }

    if (delta > 40) {
      snapTo(MAX_HEIGHT)
    } else if (delta < -40) {
      if (wasMax) snapTo(MIN_HEIGHT)
      else if (wasMin) triggerClose()
      else snapTo(MIN_HEIGHT)
    } else {
      const mid = (MIN_HEIGHT + MAX_HEIGHT) / 2
      snapTo(startH >= mid ? MAX_HEIGHT : MIN_HEIGHT)
    }
  }

  const isMax = cardHeight >= MAX_HEIGHT * 0.85

  const noImageStyle = {
    transform: closing ? 'translateY(110%)' : 'translateY(0)',
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0,0.67,0)',
    height: 'auto'
  }

  const imageStyle = {
    height: cardHeight + 'px',
    transform: closing ? 'translateY(110%)' : 'translateY(0)',
    transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.32,0,0.67,0)'
  }

  const CategoryIcon = categoryIcons[selected.category] || MapPin

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox imgs={imgs} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      <div ref={cardRef} className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" style={{ ...(hasImages ? imageStyle : noImageStyle), zIndex: 1000, boxShadow: '0 -4px 24px rgba(0,0,0,0.13)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onWheel={e => { if (!hasImages) { if (e.deltaY < 0) triggerClose() } else { if (e.deltaY > 0) snapTo(MAX_HEIGHT); else if (e.deltaY < 0) { if (cardHeight >= MAX_HEIGHT * 0.85) snapTo(MIN_HEIGHT); else triggerClose() } } }}>
        <div className="flex justify-center pt-2.5 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex-1" style={{ overflowY: 'hidden' }}>
          <div className="px-4 pt-1 pb-3">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CategoryIcon size={14} weight="fill" />
                {selected.category || '기타'}
              </span>
              {selected.price_range && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{selected.price_range}</span>}
              {selected.is_sponsored && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">제휴</span>}
            </div>

            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{selected.name}</p>
              {selected.rating > 0 && <p className="text-xs text-amber-500">{'★'.repeat(Math.round(selected.rating)) + ' ' + selected.rating}</p>}
            </div>

            {selected.description && <RichText text={selected.description} className="text-xs text-gray-500 mt-1 block" />}
            {selected.address && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <MapPin size={12} weight="fill" />
                {selected.address}
              </p>
            )}
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
            <div className="pb-6">
              <div className="md:hidden px-4 pb-20" onTouchStart={e => { e.currentTarget._swipeStartX = e.touches[0].clientX }} onTouchEnd={e => { const start = e.currentTarget._swipeStartX; if (start == null) return; const dx = e.changedTouches[0].clientX - start; e.currentTarget._swipeStartX = null; if (dx < -40 && slideIndex < imgs.length - 1) { e.stopPropagation(); setSlideIndex(i => i + 1) } else if (dx > 40 && slideIndex > 0) { e.stopPropagation(); setSlideIndex(i => i - 1) } }}>
                <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/5' }}>
                  <div className="flex h-full" style={{ transform: 'translateX(-' + (slideIndex * 100) + '%)', transition: 'transform 0.3s ease' }}>
                    {imgs.map((url, i) => (
                      <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-100">
                        <img src={url} alt={'사진 ' + (i + 1)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} draggable={false} />
                      </div>
                    ))}
                  </div>
                  {imgs.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {imgs.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all ${i === slideIndex ? 'bg-white w-2 h-2' : 'bg-white bg-opacity-50 w-1.5 h-1.5'}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden md:flex gap-3 px-4 pb-20 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {imgs.map((url, i) => (
                  <div key={i} onClick={() => setLightboxIndex(i)} className="flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center" style={{ height: '220px', minWidth: '140px', maxWidth: '360px', cursor: 'zoom-in' }}>
                    <img src={url} alt={'사진 ' + (i + 1)} style={{ height: '220px', width: 'auto', maxWidth: '360px', objectFit: 'contain', display: 'block' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '72px', background: isMax ? 'transparent' : 'linear-gradient(to bottom, transparent, white)', zIndex: 10 }}>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selected.name + ' ' + (selected.address || ''))} target="_blank" rel="noopener noreferrer" className="pointer-events-auto bg-orange-500 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap1.5" onTouchStart={e => e.stopPropagation()}>
  <MapPin size={14} weight="fill" />
  Google Maps에서 열기
</a>
          </div>
        </div>
      </div>
    </>
  )
}