import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import { supabase } from '../lib/supabase'
import { SpotCard } from '../components/SpotCard'
import { MAP_CATEGORIES, CATEGORY_ICONS_WHITE, CATEGORY_ICONS_ORANGE, CATEGORY_ICONS_BLACK } from '../lib/mapCategories'
import { getVisibleMapCategories } from '../lib/mapCategoryVisibility'
import { MapPin, Lock, ForkKnife, Calendar, Users } from '@phosphor-icons/react'

const PUBLIC_ACTIVE_TAB_KEY = 'uvain_public_active_tab'

function getStoredPublicTab() {
  return 'membership'
}

export default function PublicPage() {
  const [activeTab, setActiveTab] = useState(getStoredPublicTab)
  const [restaurants, setRestaurants] = useState([])
  const navigate = useNavigate()

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

  useEffect(() => {
    const handler = (e) => {
      if (e.touches.length === 1 && e.touches[0]?.clientX < 30) e.preventDefault()
    }
    document.addEventListener('touchstart', handler, { passive: false })
    return () => document.removeEventListener('touchstart', handler)
  }, [])

  return (
    <div
      className="flex flex-col bg-white overflow-hidden no-highlight-zone"
      style={{
        height: '100dvh',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <style>{`
        .no-highlight-zone,
        .no-highlight-zone * {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .membership-heading p + p {
          display: none;
        }
      `}</style>

      <div
        className="relative bg-white flex items-center justify-between flex-shrink-0"
        style={{
          display: 'none',
          paddingTop: 'calc(env(safe-area-inset-top) + 6px)',
          minHeight: 'calc(env(safe-area-inset-top) + 56px)',
        }}
      >
        <h1
          className="font-bold text-gray-900"
          style={{
            position: 'fixed',
            left: '32px',
            top: 'calc(env(safe-area-inset-top) + 6px)',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          UvA-IN
        </h1>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-orange-500 font-medium rounded-lg hover:bg-orange-50"
          style={{
            position: 'fixed',
            right: '14px',
            top: 'calc(env(safe-area-inset-top) + 6px)',
            height: '44px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          로그인
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div key={activeTab} className="h-full">
          {activeTab === 'map' && <PublicMapTab restaurants={restaurants} />}
          {activeTab === 'membership' && <MembershipCarousel />}
        </div>
      </div>

      <div
        className="bg-white flex flex-shrink-0 select-none"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {[
          { key: 'membership', label: 'Membership', icon: Lock },
          { key: 'map', label: 'SPOT', icon: MapPin },
        ].map((tab) => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => {
                window.sessionStorage.setItem(PUBLIC_ACTIVE_TAB_KEY, tab.key)
                setActiveTab(tab.key)
              }}
              className={
                'flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors select-none ' +
                (activeTab === tab.key ? 'text-orange-500' : 'text-gray-400')
              }
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <IconComponent size={20} weight={activeTab === tab.key ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PublicMapTab({ restaurants }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState('전체')
  const [darkMode, setDarkMode] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
  )

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
    [restaurants, activeCategory]
  )

  const visibleCategories = useMemo(
    () => getVisibleMapCategories(restaurants),
    [restaurants],
  )

  useEffect(() => {
    if (!visibleCategories.includes(activeCategory)) {
      setActiveCategory(MAP_CATEGORIES[0])
    }
  }, [activeCategory, visibleCategories])

  return (
    <div className="h-full flex flex-col no-highlight-zone">
      <div
        className="bg-white px-3 py-3 flex gap-2 overflow-x-auto flex-shrink-0 select-none dark:bg-[#121212]"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          zIndex: 10,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
  {visibleCategories.map((cat) => {
    const isActive = activeCategory === cat

    const iconSvg = isActive
      ? darkMode
        ? CATEGORY_ICONS_BLACK[cat]   // dark mode: black icon
        : CATEGORY_ICONS_WHITE[cat]   // light mode: white icon (as before)
      : CATEGORY_ICONS_ORANGE[cat]

    const activeTextClass = darkMode ? 'text-[#121212]' : 'text-white'

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
            ? `bg-orange-500 ${activeTextClass}`
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
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

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {(() => {
              const iconSvg = CATEGORY_ICONS_ORANGE[activeCategory]
              return (
                <div
                  style={{ width: 32, height: 32, margin: '0 auto 8px' }}
                  dangerouslySetInnerHTML={{ __html: iconSvg }}
                />
              )
            })()}
            <p className="text-gray-500 text-sm">등록된 장소가 없어요.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden no-highlight-zone">
          <MapView restaurants={filtered} selected={selected} onSelect={setSelected} />
          {selected && (
            <SpotCard
              selected={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

const MEMBERSHIP_SLIDES = [
  {
    key: 'intro',
    title: '완벽한 캠퍼스 라이프를 위한 시작, UvA-IN',
    description: '',
    images: [
      {
        label: 'University of Amsterdam',
        style: {
          background:
            'linear-gradient(135deg, #f97316 0%, #f8b24d 38%, #204a87 100%)',
        },
      },
      {
        label: 'Amsterdam campus',
        style: {
          background:
            'linear-gradient(140deg, #fef3c7 0%, #fb923c 42%, #1e293b 100%)',
        },
      },
    ],
  },
  {
    key: 'discounts',
    title: '로컬 맛집 & 카페 제휴 할인',
    description: '암스테르담 곳곳의 제휴 매장 혜택',
    images: [
      {
        label: 'Cafe de UvA',
        style: {
          background:
            'radial-gradient(circle at 20% 20%, #fff7ed 0 12%, transparent 13%), linear-gradient(145deg, #fed7aa 0%, #fb923c 48%, #7c2d12 100%)',
        },
      },
      {
        label: 'Local brunch spot',
        style: {
          background:
            'radial-gradient(circle at 75% 24%, #ffedd5 0 10%, transparent 11%), linear-gradient(145deg, #fde68a 0%, #f97316 46%, #431407 100%)',
        },
      },
    ],
  },
  {
    key: 'events',
    title: 'UvA-IN 이벤트 참여',
    description: 'UvA-IN 독점 이벤트 지원 혜택',
    images: [
      {
        label: 'UvA-IN night',
        style: {
          background:
            'linear-gradient(140deg, #172554 0%, #2563eb 38%, #f97316 100%)',
        },
      },
      {
        label: 'Student gathering',
        style: {
          background:
            'linear-gradient(145deg, #0f172a 0%, #7c3aed 42%, #facc15 100%)',
        },
      },
    ],
  },
  {
    key: 'network',
    title: '글로벌 캠퍼스 네트워크',
    description: 'UvA 학생 전용 커뮤니티 연결',
    images: [
      {
        label: 'Global campus',
        style: {
          background:
            'linear-gradient(140deg, #064e3b 0%, #14b8a6 42%, #f97316 100%)',
        },
      },
      {
        label: 'UvA student community',
        style: {
          background:
            'linear-gradient(145deg, #111827 0%, #22c55e 48%, #fef3c7 100%)',
        },
      },
    ],
  },
]

const SLIDE_INTERVAL_MS = 5200
const IMAGE_INTERVAL_MS = 2600
const BOTTOM_TAB_OFFSET = 'calc(env(safe-area-inset-bottom) + 8px + 45px)'

function MembershipCarousel() {
  const navigate = useNavigate()
  const [activeSlide, setActiveSlide] = useState(0)
  const [imageIndexes, setImageIndexes] = useState(() =>
    MEMBERSHIP_SLIDES.map(() => 0),
  )
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const interactionPausedRef = useRef(false)
  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)

  const goToSlide = (nextSlide) => {
    const slideCount = MEMBERSHIP_SLIDES.length
    setActiveSlide((nextSlide + slideCount) % slideCount)
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!interactionPausedRef.current) goToSlide(activeSlide + 1)
    }, SLIDE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [activeSlide])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (interactionPausedRef.current) return
      setImageIndexes((current) =>
        current.map((imageIndex, slideIndex) => {
          const imageCount = MEMBERSHIP_SLIDES[slideIndex].images.length
          return imageCount > 1 ? (imageIndex + 1) % imageCount : imageIndex
        }),
      )
    }, IMAGE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [])

  const pauseInteraction = () => {
    interactionPausedRef.current = true
  }

  const resumeInteraction = () => {
    window.setTimeout(() => {
      interactionPausedRef.current = false
    }, 900)
  }

  const handleTouchStart = (e) => {
    pauseInteraction()
    setIsDragging(true)
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
  }

  const handlePointerDown = () => {
    pauseInteraction()
  }

  const handlePointerUp = () => {
    resumeInteraction()
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return

    const deltaX = e.touches[0].clientX - touchStartXRef.current
    const deltaY = e.touches[0].clientY - touchStartYRef.current

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
      setDragOffset(deltaX)
    }
  }

  const handleTouchEnd = () => {
    if (Math.abs(dragOffset) > 56) {
      goToSlide(activeSlide + (dragOffset < 0 ? 1 : -1))
    }

    setDragOffset(0)
    setIsDragging(false)
    resumeInteraction()
  }

  return (
    <div
      className="relative h-full overflow-hidden bg-white text-gray-950 no-highlight-zone dark:bg-[#121212] dark:text-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className="flex h-full"
        style={{
          width: `${MEMBERSHIP_SLIDES.length * 100}%`,
          transform: `translateX(calc(-${activeSlide * (100 / MEMBERSHIP_SLIDES.length)}% + ${dragOffset}px))`,
          transition: isDragging
            ? 'none'
            : 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {MEMBERSHIP_SLIDES.map((slide, slideIndex) => (
          <MembershipSlide
            key={slide.key}
            slide={slide}
            imageIndex={imageIndexes[slideIndex]}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute left-0 right-0 flex justify-center gap-1.5"
        style={{
          bottom: `calc(${BOTTOM_TAB_OFFSET} + 66px)`,
          zIndex: 25,
        }}
      >
        {MEMBERSHIP_SLIDES.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            aria-label={`Go to membership slide ${index + 1}`}
            onClick={() => goToSlide(index)}
            className="pointer-events-auto h-2 rounded-full transition-all"
            style={{
              width: index === activeSlide ? 18 : 7,
              background:
                index === activeSlide
                  ? '#f97316'
                  : 'rgba(255,255,255,0.58)',
              boxShadow:
                index === activeSlide
                  ? '0 2px 10px rgba(249,115,22,0.45)'
                  : '0 1px 4px rgba(0,0,0,0.18)',
            }}
          />
        ))}
      </div>

      <div
        className="absolute left-0 right-0 px-5"
        style={{
          bottom: `calc(${BOTTOM_TAB_OFFSET} + 10px)`,
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mx-auto block w-full max-w-sm rounded-full bg-orange-500 py-3.5 text-sm font-semibold text-white shadow-xl shadow-orange-950/20 transition-colors hover:bg-orange-600"
        >
          로그인
        </button>
      </div>
    </div>
  )
}

function MembershipSlide({ slide, imageIndex }) {
  return (
    <section
      className="relative h-full flex-shrink-0 overflow-hidden"
      style={{ width: `${100 / MEMBERSHIP_SLIDES.length}%` }}
    >
      {slide.images.map((image, index) => (
        <div
          key={image.label}
          className="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{
            ...image.style,
            opacity: index === imageIndex ? 1 : 0,
          }}
        >
          <div className="absolute inset-x-8 top-[16%] grid grid-cols-2 gap-3 opacity-80">
            <div className="h-40 rounded-[8px] bg-white/18 backdrop-blur-[1px]" />
            <div className="mt-10 h-52 rounded-[8px] bg-black/12 backdrop-blur-[1px]" />
            <div className="h-36 rounded-[8px] bg-black/14 backdrop-blur-[1px]" />
            <div className="h-32 rounded-[8px] bg-white/20 backdrop-blur-[1px]" />
          </div>
          <span className="absolute bottom-[38%] left-6 rounded-full bg-black/24 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            {image.label}
          </span>
        </div>
      ))}

      <div className="absolute inset-0 bg-white/34 dark:bg-black/38" />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '58%',
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.84) 58%, #ffffff 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 hidden dark:block"
        style={{
          height: '58%',
          background:
            'linear-gradient(to bottom, rgba(18,18,18,0), rgba(18,18,18,0.84) 58%, #121212 100%)',
        }}
      />

      <div
        className="absolute left-0 right-0 px-6 text-left"
        style={{
          bottom: `calc(${BOTTOM_TAB_OFFSET} + 112px)`,
          zIndex: 10,
        }}
      >
        <h2 className="max-w-sm text-[31px] font-bold leading-tight text-gray-950 dark:text-white">
          {slide.title}
        </h2>
        {slide.description && (
          <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-300">
            {slide.description}
          </p>
        )}
      </div>
    </section>
  )
}

// eslint-disable-next-line no-unused-vars
function MembershipTab() {
  const navigate = useNavigate()
  return (
    <div className="h-full overflow-y-auto flex items-center justify-center bg-white no-highlight-zone">
      <div
        className="py-8"
        style={{ width: 'calc(100% - 32px)', maxWidth: '368px' }}
      >
        <div className="membership-heading text-center mb-8">
          <h2 className="mb-2 text-3xl font-bold text-gray-900">완벽한 캠퍼스 라이프를 위한 시작</h2>
          <p className="text-sm font-normal leading-relaxed text-gray-400">
            UvA-IN Membership
          </p>
          <p className="text-gray-500 text-sm leading-relaxed">UvA-IN Membership</p>
        </div>

        <div className="space-y-3 mb-8">
          <Benefit icon={<ForkKnife size={24} weight="fill" color="#f97316" />} title="로컬 맛집 & 카페 제휴 할인">
            암스테르담 곳곳의 제휴 매장 혜택
          </Benefit>
          <Benefit icon={<Calendar size={24} weight="fill" color="#3b82f6" />} title="캠퍼스 이벤트 참가비 할인">
            UvA-IN 독점 이벤트 지원 혜택
          </Benefit>
          <Benefit icon={<Users size={24} weight="fill" color="#22c55e" />} title="글로벌 캠퍼스 네트워크">
            UvA 학생 전용 커뮤니티 연결
          </Benefit>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="mb-3 w-full rounded-full bg-orange-500 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
        >
          로그인
        </button>

        <button
  onClick={() => navigate('/register')}
  style={{ display: 'none' }}
  className="
    w-full
    font-semibold
    py-3
    rounded-full
    transition-colors
    bg-gray-200 text-gray-900 hover:bg-gray-300
    dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700
  "
>
  회원가입
</button>
      </div>
    </div>
  )
}

function Benefit({ icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{children}</p>
      </div>
    </div>
  )
}
