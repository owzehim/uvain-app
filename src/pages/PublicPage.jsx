import { useState, useEffect, useMemo } from 'react'
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
          {activeTab === 'membership' && <MembershipTab />}
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

function MembershipTab() {
  const navigate = useNavigate()
  return (
    <div className="h-full overflow-y-auto flex items-center justify-center bg-white no-highlight-zone">
      <div
        className="py-8"
        style={{ width: 'calc(100% - 32px)', maxWidth: '368px' }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Lock size={48} weight="fill" color="#f97316" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">UvA 대학 생활을 완벽하게 즐기는 방법.</h2>
          <p className="text-gray-500 text-sm leading-relaxed">UvA-IN Membership</p>
        </div>

        <div className="space-y-3 mb-8">
          <Benefit icon={<ForkKnife size={24} weight="fill" color="#f97316" />} title="로컬 맛집부터 단골 카페까지">
            암스테르담 곳곳의 제휴 매장에서 즐기는 특별 할인
          </Benefit>
          <Benefit icon={<Calendar size={24} weight="fill" color="#3b82f6" />} title="더 많은 참여와 경험을 위한 기회">
            UvA-IN 멤버에게만 제공되는 다양한 이벤트 참가비 특별 할인
          </Benefit>
          <Benefit icon={<Users size={24} weight="fill" color="#22c55e" />} title="더 넓은 세계와 연결되는 커뮤니티">
            국적을 넘어 암스테르담의 모든 UvA 학생들과 교류하는 전용 네트워크
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
