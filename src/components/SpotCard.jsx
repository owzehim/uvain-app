import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Ticket, Star } from '@phosphor-icons/react'
import { CATEGORY_ICONS } from '../lib/mapCategories'
import { BowlSteam, HandHeart, Wine, CoinVertical } from '@phosphor-icons/react'
import { useStoreReviewSummary } from '../hooks/useStoreReviewSummary'
import {
  computeStarDisplay,
  getSortedTagsForDisplay,
  formatAverageRating,
} from '../domain/reviewDomain'

export function RichText({ text, className = '' }) {
  if (!text) return null
  return <span className={className} dangerouslySetInnerHTML={{ __html: text }} />
}

const TAG_ICON_COMPONENTS = {
  BowlSteam,
  HandHeart,
  Wine,
  CoinVertical,
}

// ── Read-only star row ──────────────────────────────────────────
function StarDisplay({ averageRating }) {
  const formatted = formatAverageRating(averageRating)
  if (!formatted) return null

  const { filled, half, empty } = computeStarDisplay(averageRating)

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {/* full orange stars */}
        {Array.from({ length: filled }).map((_, i) => (
          <Star key={'f' + i} size={12} weight="fill" color="#f97316" />
        ))}

        {/* half star: 50% orange, 50% grey */}
        {half && (
          <span key="half" className="relative inline-flex">
            {/* grey full star underneath */}
            <Star size={12} weight="fill" color="#d1d5db" />
            {/* left half orange on top */}
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: '50%' }}
            >
              <Star size={12} weight="fill" color="#f97316" />
            </span>
          </span>
        )}

        {/* empty grey stars */}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={'e' + i} size={12} weight="fill" color="#d1d5db" />
        ))}
      </div>
      <span className="text-xs text-amber-500 font-medium">{formatted}</span>
    </div>
  )
}

// ── Tag bar chart ───────────────────────────────────────────────
function TagBarChart({ tagCounts, reviewCount }) {
  const sorted = getSortedTagsForDisplay(tagCounts)
  if (sorted.length === 0) return null

  const maxCount = sorted[0].count

  return (
  <div className="pb-4">
    <div className="pt-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500">멤버 리뷰</p>
        <span className="text-xs text-gray-400">{reviewCount}개</span>
      </div>

        <div className="flex flex-col gap-2.5">
          {sorted.map((tag) => {
            const IconComponent = TAG_ICON_COMPONENTS[tag.icon]
            const pct =
              maxCount > 0 ? Math.round((tag.count / maxCount) * 100) : 0

            return (
              <div key={tag.key} className="flex items-center gap-2">
                <div className="flex items-center gap-1 w-28 flex-shrink-0">
                  {IconComponent && (
                    <IconComponent size={13} weight="fill" color="#f97316" />
                  )}
                  {!IconComponent && (
                    <span className="text-xs text-red-500">
                      ❌ No icon for: {tag.icon}
                    </span>
                  )}
                  <span className="text-xs text-gray-600 truncate">
                    {tag.label}
                  </span>
                </div>

                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="text-xs text-gray-400 font-medium w-4 text-right flex-shrink-0">
                  {tag.count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Lightbox ────────────────────────────────────────────────────
function Lightbox({ imgs, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex)
  const [visible, setVisible] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  // zoom-in + fade-in on open
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, imgs.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [imgs.length])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => onClose(), 250)
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

    // Vertical swipe (up or down) → close
    if (absDy > absDx && absDy > 60) {
      handleClose()
    }
    // Horizontal swipe → next / prev
    else if (absDx > absDy && absDx > 40) {
      if (dx < 0) {
        // swipe left → next
        setIndex((i) => Math.min(i + 1, imgs.length - 1))
      } else {
        // swipe right → prev
        setIndex((i) => Math.max(i - 1, 0))
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <>
      <style>{`
        @keyframes lightboxZoomIn {
          from {
            transform: scale(0.9);
          }
          to {
            transform: scale(1);
          }
        }
        .lightbox-zoom-enter {
          animation: lightboxZoomIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
      `}</style>

      <div
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
        }}
      >
        {/* Image — full opacity, no drag tracking */}
        <img
          src={imgs[index]}
          alt={'사진 ' + (index + 1)}
          onClick={(e) => e.stopPropagation()}
          className={visible ? 'lightbox-zoom-enter' : ''}
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            borderRadius: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />

        {/* Dots */}
        {imgs.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
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
                  setIndex(i)
                }}
                style={{
                  width: i === index ? 8 : 6,
                  height: i === index ? 8 : 6,
                  borderRadius: '999px',
                  background: i === index ? '#fff' : 'rgba(255,255,255,0.4)',
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

// ── Thumbnail grid (same on mobile + desktop) ───────────────────
function ImageThumbnails({ imgs, onTap }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {imgs.map((url, i) => (
        <div
          key={i}
          onClick={() => onTap(i)}
          className="flex-shrink-0 rounded-xl overflow-hidden bg-gray-100"
          style={{
            width: '100px',
            height: '125px',
            cursor: 'zoom-in',
          }}
        >
          <img
            src={url}
            alt={'사진 ' + (i + 1)}
            loading={i === 0 ? 'eager' : 'lazy'}
            style={{
              width: '100px',
              height: '125px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      ))}
    </div>
  )
}

export function SpotCard({ selected, onClose }) {
  const [cardHeight, setCardHeight] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [closing, setClosing] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const lastYRef = useRef(0)
  const cardRef = useRef(null)

  const imgs = selected['image_urls'] || []
  const hasImages = imgs.length > 0

  const { summary, loading: summaryLoading } = useStoreReviewSummary(
    selected?.partnership_id,
  )

  const { WIN_H, WIN_W } = useMemo(
    () => ({
      WIN_H: typeof window !== 'undefined' ? window.innerHeight : 700,
      WIN_W: typeof window !== 'undefined' ? window.innerWidth : 1024,
    }),
    [],
  )

  const isDesktop = WIN_W >= 768
  const MIN_HEIGHT = Math.min(WIN_H * 0.38, 260)
  const MAX_HEIGHT = isDesktop ? 460 : WIN_H * 0.88

  // Trigger animation on mount
  useEffect(() => {
    if (selected) {
      setIsVisible(false)
      setCardHeight(MIN_HEIGHT)
      setClosing(false)
      // Trigger animation on next frame
      requestAnimationFrame(() => setIsVisible(true))
    }
  }, [selected, MIN_HEIGHT])

  const triggerClose = () => {
    setClosing(true)
    setTimeout(() => onClose(), 320)
  }

  const snapTo = (height) => setCardHeight(height)

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY
    lastYRef.current = e.touches[0].clientY
    startHeightRef.current =
      hasImages ? cardHeight : cardRef.current?.offsetHeight || MIN_HEIGHT
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    lastYRef.current = e.touches[0].clientY
    const delta = startYRef.current - e.touches[0].clientY

    // Prevent scroll when clearly vertical swipe (like membership card)
    if (Math.abs(delta) > 10) {
      e.preventDefault()
    }

    // Snapping happens in handleTouchEnd.
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
  const iconSvg = CATEGORY_ICONS[selected.category]
  const hasReviews = summary && summary.review_count > 0

  // treat empty / whitespace / HTML-only as empty (no ※)
  const rawTerms = selected.discount_terms ?? ''
  const cleanedTerms = rawTerms
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .replace(/\s/g, '')
  const discountTerms = cleanedTerms ? selected.discount_terms : null

  const noImageStyle = {
    transform: closing
      ? 'translateY(110%)'
      : isVisible
      ? 'translateY(0)'
      : 'translateY(110%)',
    transition: isDragging
      ? 'none'
      : 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
    height: 'auto',
  }

  const imageStyle = {
    height: cardHeight + 'px',
    transform: closing
      ? 'translateY(110%)'
      : isVisible
      ? 'translateY(0)'
      : 'translateY(110%)',
    transition: isDragging
      ? 'none'
      : 'height 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1)',
  }

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox
          imgs={imgs}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <div
        ref={cardRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl"
        style={{
          ...(hasImages ? imageStyle : noImageStyle),
          zIndex: 1000,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.13)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={(e) => {
          if (!hasImages) {
            if (e.deltaY < 0) triggerClose()
          } else {
            if (e.deltaY > 0) snapTo(MAX_HEIGHT)
            else if (e.deltaY < 0) {
              if (cardHeight >= MAX_HEIGHT * 0.85) snapTo(MIN_HEIGHT)
              else triggerClose()
            }
          }
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex-1 px-5" style={{ overflowY: 'hidden' }}>
          {/* ── Place info ── */}
          <div className="pt-1 pb-3">
            {/* Category, price, sponsored badges (kept but not rendered) */}
            {false && (
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {iconSvg && (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: iconSvg.replace(
                          'fill="currentColor"',
                          'fill="#f97316"',
                        ),
                      }}
                      style={{
                        width: '14px',
                        height: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    />
                  )}
                  {selected.category || '기타'}
                </span>

                {selected.price_range && (
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                    {selected.price_range}
                  </span>
                )}

                {selected.is_sponsored && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                    제휴
                  </span>
                )}
              </div>
            )}

            {/* Store name */}
            <p className="font-semibold text-gray-900 text-lg">
              {selected.name}
            </p>

            {/* Star review - NOW UNDER THE TITLE */}
            {hasReviews && (
              <div className="flex items-center gap-1 mt-1">
                <StarDisplay averageRating={summary.average_rating} />
                <span className="text-xs text-gray-400">
                  ({summary.review_count})
                </span>
              </div>
            )}

            {summaryLoading && (
              <span className="text-xs text-gray-300 mt-1 block">
                로딩 중...
              </span>
            )}

            {/* Description, address, discount info */}
            {selected.description && (
              <RichText
                text={selected.description}
                className="text-xs text-gray-500 mt-1 block"
              />
            )}

            {selected.discount_info && (
              <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                <Ticket size={14} weight="fill" color="#FF5252" />
                <RichText text={selected.discount_info} />
              </p>
            )}

            {discountTerms && (
              <p className="text-xs text-gray-800 mt-0.5">
                ※ <RichText text={discountTerms} />
              </p>
            )}

            {selected.address && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <MapPin size={12} weight="fill" />
                {selected.address}
              </p>
            )}
          </div>

          {/* ── Images: same thumbnail grid on mobile + desktop ── */}
          {hasImages && (
            <div className="mb-3">
              <ImageThumbnails
                imgs={imgs}
                onTap={(i) => setLightboxIndex(i)}
              />
            </div>
          )}

{/* ── 한 줄 평가 ── */}
{selected.one_line_review && (
  <div className="mt-8 mb-6">
    {/* 타이틀: 말풍선 밖, 왼쪽 정렬 */}
    <p className="text-xs font-semibold text-gray-500 mb-2 text-left">
      한 줄 평가
    </p>

    <div className="relative w-full">
      {/* 네모 말풍선 + 아래에서 왼쪽으로 휘어나가는 꼬리 */}
      <svg
        className="w-full"
        viewBox="0 0 360 80"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        style={{ minHeight: '56px' }}
      >
        {/* 본체: 부드러운 직사각형 */}
        <rect
          x="0"
          y="0"
          width="360"
          height="56"
          rx="16"
          ry="16"
          fill="#f97316"
        />

        {/* 아래에서 시작해서 왼쪽으로 휘어나가는 꼬리 */}
        <path
          d="
            M 40 56
            C 30 60 20 65 15 75
            C 18 70 22 62 25 56
            Z
          "
          fill="#f97316"
        />
      </svg>

      {/* 텍스트: 직사각형 영역 안에서 수직 중앙 정렬 */}
      <div
        className="absolute left-0 right-0 top-0 flex items-center justify-center px-3 sm:px-4 md:px-6"
        style={{ height: '56px' }}
      >
        <RichText
          text={selected.one_line_review}
          className="font-semibold text-white text-base sm:text-lg text-center block"
        />
      </div>
    </div>
  </div>
)}

          {/* ── Member review bar chart ── */}
          {hasReviews && (
            <TagBarChart
              tagCounts={summary.tag_counts}
              reviewCount={summary.review_count}
            />
          )}

          {/* ── 임원 리뷰 ── */}
{(selected.review || selected.reviewer_name) && (
  <div className="pb-4">
    <div className="pt-3">
      <p className="text-xs font-semibold text-gray-500 mb-1.5">
        임원 리뷰
      </p>
      {selected.review && (
        <RichText
          text={selected.review}
          className="text-xs text-gray-600 block"
        />
      )}
      {selected.reviewer_name && (
        <p className="text-xs text-gray-400 mt-0.5">
          {'— ' + selected.reviewer_name}
        </p>
      )}
    </div>
  </div>
)}
          <div className="pb-16" />
        </div>

        {/* Bottom gradient + Google Maps button */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '72px',
            background: isMax
              ? 'transparent'
              : 'linear-gradient(to bottom, transparent, white)',
            zIndex: 10,
          }}
        >
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            <a
              href={
                'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(
                  selected.name + ' ' + (selected.address || ''),
                )
              }
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto bg-orange-500 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5"
              onTouchStart={(e) => e.stopPropagation()}
            >
              <MapPin size={14} weight="fill" />
              Google Maps에서 열기
            </a>
          </div>
        </div>
      </div>
    </>
  )
}