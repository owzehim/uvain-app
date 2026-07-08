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
      className={
        'flex flex-col overflow-hidden no-highlight-zone ' +
        (activeTab === 'membership'
          ? 'bg-black'
          : 'bg-white dark:bg-[#121212]')
      }
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
        .membership-carousel {
          --membership-dot-active: #111827;
          --membership-dot-idle: rgba(17, 24, 39, 0.32);
        }
        .dark .membership-carousel {
          --membership-dot-active: #ffffff;
          --membership-dot-idle: rgba(255, 255, 255, 0.4);
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
        className="bg-white flex flex-shrink-0 select-none dark:bg-[#121212]"
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
    title: 'UvA 대학 생활의 완벽한 시작',
    description: '',
    images: [
      {
        src: '/PublicPage_MembershipTab_Images/uva-campus-1.jpg',
      },
      {
        src: '/PublicPage_MembershipTab_Images/uva-campus-2.jpg',
      },
      {
        src: '/PublicPage_MembershipTab_Images/uva-campus-3.jpg',
      },
      {
        src: '/PublicPage_MembershipTab_Images/uva-campus-4.jpg',
      },
    ],
  },
  {
    key: 'discounts',
    title: '로컬 맛집 & 카페 제휴 할인',
    description: '암스테르담 곳곳의 제휴 매장 혜택',
    images: [
      {
        src: '/PublicPage_MembershipTab_Images/restaurant-cafe-1.jpg',
      },
      {
        src: '/PublicPage_MembershipTab_Images/restaurant-cafe-2.jpg',
      },
    ],
  },
  {
    key: 'events',
    title: 'UvA-IN 이벤트 참여 혜택',
    description: 'UvA-IN 독점 이벤트 지원 혜택 및 참가비 할인',
    images: [
      {
        src: '/PublicPage_MembershipTab_Images/uvain-event-1.png',
      },
      {
        src: '/PublicPage_MembershipTab_Images/uvain-event-2.jpg',
      },
      {
        src: '/PublicPage_MembershipTab_Images/uvain-event-3.jpg',
      },
    ],
  },
  {
    key: 'network',
    title: '글로벌 캠퍼스 네트워크',
    description: 'UvA 학생 전용 커뮤니티 연결',
    images: [
      {
        src: '/PublicPage_MembershipTab_Images/uvain-network-1.jpg',
      },
      {
        src: '/PublicPage_MembershipTab_Images/uvain-network-2.jpeg',
      },
    ],
  },
]

const SLIDE_INTERVAL_MS = 12000
const IMAGE_INTERVAL_MS = 2600
const BOTTOM_TAB_OFFSET = 'calc(env(safe-area-inset-bottom) + 8px + 45px)'

function MembershipCarousel() {
  const navigate = useNavigate()
  const [activeSlide, setActiveSlide] = useState(0)
  const [transitionEnabled, setTransitionEnabled] = useState(true)
  const [imageIndexes, setImageIndexes] = useState(() =>
    MEMBERSHIP_SLIDES.map(() => 0),
  )
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const interactionPausedRef = useRef(false)
  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)

  const slides = MEMBERSHIP_SLIDES
  const displaySlides = useMemo(() => [...slides, slides[0]], [slides])
  const realActiveSlide = activeSlide % slides.length

  const goToSlide = (nextSlide) => {
    setTransitionEnabled(true)
    if (nextSlide < 0) {
      setActiveSlide(slides.length - 1)
      return
    }
    setActiveSlide(nextSlide)
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!interactionPausedRef.current) goToSlide(activeSlide + 1)
    }, SLIDE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [activeSlide, slides.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (interactionPausedRef.current) return
      setImageIndexes((current) =>
        current.map((imageIndex, slideIndex) => {
          const imageCount = slides[slideIndex]?.images.length || 0
          return imageCount > 1 ? (imageIndex + 1) % imageCount : imageIndex
        }),
      )
    }, IMAGE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [slides])

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

  const handleSlideTransitionEnd = () => {
    if (activeSlide !== slides.length) return

    setTransitionEnabled(false)
    setActiveSlide(0)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setTransitionEnabled(true))
    })
  }

  return (
    <div
      className="membership-carousel relative h-full overflow-hidden bg-white text-gray-950 no-highlight-zone dark:bg-[#121212] dark:text-white"
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
        onTransitionEnd={handleSlideTransitionEnd}
        style={{
          width: `${displaySlides.length * 100}%`,
          transform: `translateX(calc(-${activeSlide * (100 / displaySlides.length)}% + ${dragOffset}px))`,
          transition: isDragging || !transitionEnabled
            ? 'none'
            : 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {displaySlides.map((slide, slideIndex) => (
          <MembershipSlide
            key={`${slide.key}-${slideIndex}`}
            slide={slide}
            slideCount={displaySlides.length}
            imageIndex={imageIndexes[slideIndex % slides.length]}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-black/30 dark:bg-black/38" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: '58%',
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.84) 58%, #ffffff 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden dark:block"
        style={{
          height: '58%',
          background:
            'linear-gradient(to bottom, rgba(18,18,18,0), rgba(18,18,18,0.84) 58%, #121212 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute left-0 right-0 px-6 text-left"
        style={{
          bottom: `calc(${BOTTOM_TAB_OFFSET} + 62px)`,
          zIndex: 20,
        }}
      >
        <h2 className="max-w-sm text-[31px] font-bold leading-tight text-gray-950 dark:text-white">
          {slides[realActiveSlide].title}
        </h2>
        {slides[realActiveSlide].description && (
          <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-300">
            {slides[realActiveSlide].description}
          </p>
        )}
      </div>

      <div
        className="pointer-events-none absolute left-0 right-0 flex justify-center gap-1.5"
        style={{
          bottom: `calc(${BOTTOM_TAB_OFFSET} + 24px)`,
          zIndex: 25,
        }}
      >
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            aria-label={`Go to membership slide ${index + 1}`}
            onClick={() => goToSlide(index)}
            className="pointer-events-auto rounded-full transition-all"
            style={{
              width: index === realActiveSlide ? 8 : 6,
              height: index === realActiveSlide ? 8 : 6,
              background:
                index === realActiveSlide
                  ? 'var(--membership-dot-active)'
                  : 'var(--membership-dot-idle)',
            }}
          />
        ))}
      </div>

      <div
        className="absolute left-0 right-0 px-5"
        style={{
          bottom: `calc(${BOTTOM_TAB_OFFSET} - 42px)`,
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mx-auto block w-full max-w-sm rounded-full bg-orange-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          로그인
        </button>
      </div>
    </div>
  )
}

function MembershipSlide({ slide, slideCount, imageIndex }) {
  return (
    <section
      className="relative h-full flex-shrink-0 overflow-hidden bg-neutral-400 dark:bg-neutral-700"
      style={{ width: `${100 / slideCount}%` }}
    >
      {slide.images.map((image, index) => (
        <div
          key={image.src || image.label || index}
          className="absolute inset-0 bg-neutral-400 bg-cover bg-center transition-opacity duration-1000 ease-out dark:bg-neutral-700"
          style={{
            ...image.style,
            backgroundImage: image.src ? `url("${image.src}")` : image.style?.background,
            opacity: index === imageIndex ? 1 : 0,
          }}
        >
          {!image.src && (
            <div className="absolute inset-x-8 top-[16%] grid grid-cols-2 gap-3 opacity-80">
              <div className="h-40 rounded-[8px] bg-white/18 backdrop-blur-[1px]" />
              <div className="mt-10 h-52 rounded-[8px] bg-black/12 backdrop-blur-[1px]" />
              <div className="h-36 rounded-[8px] bg-black/14 backdrop-blur-[1px]" />
              <div className="h-32 rounded-[8px] bg-white/20 backdrop-blur-[1px]" />
            </div>
          )}
        </div>
      ))}

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
