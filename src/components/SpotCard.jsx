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

// ─── Shared nav button ────────────────────────────────────────────────────────
function NavBtn({ onClick, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(30,30,30,0.7)',
        border: 'none',
        color: '#fff',
        borderRadius: '999px',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        lineHeight: 1,
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        transition: 'background 0.15s',
        flexShrink: 0,
        ...style
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,30,0.92)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,30,30,0.7)')}>
      {children}
    </button>
  )
}

// ─── Desktop full-screen image preview ───────────────────────────────────────
function ImagePreview({ imgs, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, imgs.length - 1))
      else if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0))
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [imgs.length, onClose])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}>
      {idx > 0 && (
        <NavBtn
          onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }}
          style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10000 }}>
          ‹
        </NavBtn>
      )}
      <img
        src={imgs[idx]}
        alt={'사진 ' + (idx + 1)}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
      />
      {idx < imgs.length - 1 && (
        <NavBtn
          onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }}
          style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10000 }}>
          ›
        </NavBtn>
      )}
      {imgs.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
          {imgs.map((_, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={`rounded-full cursor-pointer transition-all ${i === idx ? 'bg-white w-2 h-2' : 'bg-white bg-opacity-40 w-1.5 h-1.5'}`}
            />
          ))}
        </div>
      )}
      <NavBtn
        onClick={onClose}
        style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10000, fontSize: '14px' }}>
        ✕
      </NavBtn>
    </div>
  )
}

// ─── SpotCard ─────────────────────────────────────────────────────────────────
export function SpotCard({ selected, onClose }) {
  const [cardHeight, setCardHeight] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [closing, setClosing] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(null)

  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const lastYRef = useRef(0)
  const cardRef = useRef(null)
  // Use a ref for cardHeight so the wheel handler always reads the latest value
  const cardHeightRef = useRef(0)

  const imgs = selected['image_urls'] || []
  const hasImages = imgs.length > 0

  const WIN_H = typeof window !== 'undefined' ? window.innerHeight : 700
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768

  const MIN_HEIGHT = isDesktop ? 220 : Math.min(WIN_H * 0.38, 260)
  const MAX_HEIGHT = isDesktop ? 440 : WIN_H * 0.88

  // Keep ref in sync with state
  const updateHeight = (h) => {
    cardHeightRef.current = h
    setCardHeight(h)
  }

  useEffect(() => {
    updateHeight(MIN_HEIGHT)
    setSlideIndex(0)
    setClosing(false)
    setPreviewIndex(null)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerClose = () => {
    setClosing(true)
    setTimeout(() => onClose(), 320)
  }

  // ── Wheel — desktop ────────────────────────────────────────────────────────
  // deltaY > 0 = scroll DOWN  → minimize then close
  // deltaY < 0 = scroll UP    → expand to show photos
  useEffect(() => {
    if (!isDesktop) return
    const el = cardRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()
      e.stopPropagation()

      const delta = e.deltaY
      const current = cardHeightRef.current

      if (delta < 0) {
        // Scroll UP → expand
        const next = Math.min(current + Math.abs(delta) * 1.5, MAX_HEIGHT)
        updateHeight(next)
      } else {
        // Scroll DOWN → minimize or close
        if (current <= MIN_HEIGHT * 1.05) {
          // Already at minimum → close
          triggerClose()
        } else {
          const next = Math.max(current - delta * 1.5, MIN_HEIGHT)
          updateHeight(next)
        }
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isDesktop, MIN_HEIGHT, MAX_HEIGHT]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wheel — mobile (only when hasImages) ──────────────────────────────────
  useEffect(() => {
    if (isDesktop || !hasImages) return
    const el = cardRef.current
    if (!el) return

    const onWheel = (e) => {
      const delta = e.deltaY
      if (delta === 0) return
      e.preventDefault()

      setCardHeight(h => {
        let next = h + (delta > 0 ? Math.abs(delta) * 1.5 : delta * 1.5)
        if (next > MAX_HEIGHT) next = MAX_HEIGHT
        if (next < MIN_HEIGHT * 0.5) {
          setClosing(true)
          setTimeout(() => onClose(), 320)
          return 0
        }
        if (next < MIN_HEIGHT) next = MIN_HEIGHT
        return next
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isDesktop, hasImages, MAX_HEIGHT, MIN_HEIGHT, onClose])

  // ── Touch (mobile) ────────────────────────────────────────────────────────
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
      updateHeight(newHeight)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    const delta = startYRef.current - lastYRef.current
    const startH = startHeightRef.current
    const wasMax = startH >= MAX_HEIGHT * 0.85
    const wasMin = startH <= MIN_HEIGHT * 1.15
    if (!hasImages) { if (delta < -40) triggerClose(); return }
    if (delta > 40) { updateHeight(MAX_HEIGHT) }
    else if (delta < -40) {
      if (wasMax) updateHeight(MIN_HEIGHT)
      else if (wasMin) triggerClose()
      else updateHeight(MIN_HEIGHT)
    } else {
      const mid = (MIN_HEIGHT + MAX_HEIGHT) / 2
      updateHeight(startH >= mid ? MAX_HEIGHT : MIN_HEIGHT)
    }
  }

  const isMax = cardHeight >= MAX_HEIGHT * 0.85

  // ── Styles ─────────────────────────────────────────────────────────────────
  const desktopStyle = {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    width: '340px',
    height: cardHeight + 'px',
    borderRadius: '20px',
    transform: closing ? 'translateY(calc(100% + 24px))' : 'translateY(0)',
    transition: isDragging
      ? 'none'
      : 'height 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.32,0,0.67,0)',
  }

  const mobileStyle = {
    height: hasImages ? cardHeight + 'px' : 'auto',
    transform: closing ? 'translateY(110%)' : 'translateY(0)',
    transition: isDragging
      ? 'none'
      : hasImages
        ? 'height 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.32,0,0.67,0)'
        : 'transform 0.3s cubic-bezier(0.32,0,0.67,0)',
    borderRadius: '16px 16px 0 0',
  }

  return (
    <>
      {previewIndex !== null && (
        <ImagePreview imgs={imgs} startIndex={previewIndex} onClose={() => setPreviewIndex(null)} />
      )}

      <div
        ref={cardRef}
        className={isDesktop ? '' : 'absolute bottom-0 left-0 right-0'}
        style={{
          ...(isDesktop ? desktopStyle : mobileStyle),
          zIndex: 1000,
          background: 'white',
          boxShadow: isDesktop
            ? '0 8px 32px rgba(0,0,0,0.18)'
            : '0 -4px 24px rgba(0,0,0,0.13)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}>

        {/* Header: scroll hint + close button (desktop) | drag handle (mobile) */}
        {isDesktop ? (
          <div className="flex justify-between items-center px-4 pt-3 pb-1 flex-shrink-0">
            <span className="text-xs text-gray-400 select-none">
              {isMax ? '↓ 스크롤로 닫기' : hasImages ? '↑ 스크롤로 사진 보기' : '↓ 스크롤로 닫기'}
            </span>
            <button
              onClick={triggerClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', fontSize: '18px', lineHeight: 1, padding: '2px 4px'
              }}>
              ✕
            </button>
          </div>
        ) : (
          <div className="flex justify-center pt-2.5 pb-2 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1" style={{ overflow: 'hidden' }}>
          {/* Info */}
          <div className="px-4 pt-1 pb-3">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {(categoryIcons[selected.category] || '📍') + ' ' + (selected.category || '기타')}
              </span>
              {selected.price_range && (
                <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{selected.price_range}</span>
              )}
              {selected.is_sponsored && (
                <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">제휴</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{selected.name}</p>
              {selected.rating > 0 && (
                <p className="text-xs text-amber-500">
                  {'★'.repeat(Math.round(selected.rating)) + ' ' + selected.rating}
                </p>
              )}
            </div>
            {selected.description && (
              <RichText text={selected.description} className="text-xs text-gray-500 mt-1 block" />
            )}
            {selected.address && (
              <p className="text-xs text-gray-500 mt-1">{'📍 ' + selected.address}</p>
            )}
            {selected.discount_info && (
              <p className="text-xs text-orange-500 mt-1">
                🎟 <RichText text={selected.discount_info} />
              </p>
            )}
            {selected.discount_terms && (
              <p className="text-xs text-gray-400 mt-0.5">
                ※ <RichText text={selected.discount_terms} />
              </p>
            )}
            {(selected.review || selected.reviewer_name) && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                {selected.review && (
                  <RichText text={selected.review} className="text-xs text-gray-600 block" />
                )}
                {selected.reviewer_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{'— ' + selected.reviewer_name}</p>
                )}
              </div>
            )}
          </div>

          {/* Spacer when no images so button floats nicely */}
          {!hasImages && <div className="pb-16" />}

          {/* Images */}
          {hasImages && (
            <div className="pb-4">
              {/* MOBILE: 4:5 box, swipe + dots */}
              <div
                className="md:hidden px-4 pb-16"
                onTouchStart={e => { e.currentTarget._swipeStartX = e.touches[0].clientX }}
                onTouchEnd={e => {
                  const start = e.currentTarget._swipeStartX
                  if (start == null) return
                  const dx = e.changedTouches[0].clientX - start
                  e.currentTarget._swipeStartX = null
                  if (dx < -40 && slideIndex < imgs.length - 1) {
                    e.stopPropagation()
                    setSlideIndex(i => i + 1)
                  } else if (dx > 40 && slideIndex > 0) {
                    e.stopPropagation()
                    setSlideIndex(i => i - 1)
                  }
                }}>
                <div
                  className="relative rounded-2xl overflow-hidden bg-gray-100"
                  style={{ aspectRatio: '4/5' }}>
                  <div
                    className="flex h-full"
                    style={{
                      transform: 'translateX(-' + slideIndex * 100 + '%)',
                      transition: 'transform 0.3s ease'
                    }}>
                    {imgs.map((url, i) => (
                      <div
                        key={i}
                        className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-100">
                        <img
                          src={url}
                          alt={'사진 ' + (i + 1)}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
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
                          className={`rounded-full transition-all ${
                            i === slideIndex ? 'bg-white w-2 h-2' : 'bg-white bg-opacity-50 w-1.5 h-1.5'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* DESKTOP: horizontal row, click to open full preview */}
              <div
                className="hidden md:flex gap-3 px-4 pb-4 overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {imgs.map((url, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ height: '150px', minWidth: '100px', maxWidth: '260px' }}
                    onClick={() => setPreviewIndex(i)}>
                    <img
                      src={url}
                      alt={'사진 ' + (i + 1)}
                      style={{ height: '150px', width: 'auto', maxWidth: '260px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Google Maps button */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '72px',
            background: isMax ? 'transparent' : 'linear-gradient(to bottom, transparent, white)',
            zIndex: 10
          }}>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <a
              href={
                'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(selected.name + ' ' + (selected.address || ''))
              }
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto bg-orange-500 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2"
              style={{ maxWidth: '260px' }}
              onTouchStart={e => e.stopPropagation()}>
              🗺️ Google Maps에서 열기
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
