import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import { supabase } from '../lib/supabase'
import { SpotCard } from '../components/SpotCard'
import { MAP_CATEGORIES, CATEGORY_ICONS_WHITE, CATEGORY_ICONS_ORANGE, CATEGORY_ICONS_BLACK } from '../lib/mapCategories'
import { getVisibleMapCategories } from '../lib/mapCategoryVisibility'
import { MapPin, Lock, ForkKnife, Calendar, Users } from '@phosphor-icons/react'

const PUBLIC_ACTIVE_TAB_KEY = 'uvain_public_active_tab'
const PUBLIC_TABS = ['map', 'membership']

function getStoredPublicTab() {
  if (typeof window === 'undefined') return 'map'
  const storedTab = window.sessionStorage.getItem(PUBLIC_ACTIVE_TAB_KEY)
  return PUBLIC_TABS.includes(storedTab) ? storedTab : 'map'
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
      if (e.touches[0]?.clientX < 30) e.preventDefault()
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
          paddingTop: 'calc(env(safe-area-inset-top) + 2px)',
          minHeight: 'calc(env(safe-area-inset-top) + 48px)',
        }}
      >
        <h1
          className="font-bold text-gray-900"
          style={{
            position: 'fixed',
            left: '32px',
            top: 'calc(env(safe-area-inset-top) + 2px)',
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
            top: 'calc(env(safe-area-inset-top) + 2px)',
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
          { key: 'map', label: 'SPOT', icon: MapPin },
          { key: 'membership', label: 'Membership', icon: Lock },
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
      <div className="bg-white px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0 select-none">
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
              constrainToParent
              fillParentMax
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
      <div className="px-4 py-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Lock size={48} weight="fill" color="#f97316" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">UvA-IN Membership</h2>
          <p className="text-gray-500 text-sm leading-relaxed">UvA-IN 멤버가 되어 다양한 혜택을 누려보세요.</p>
        </div>

        <div className="space-y-3 mb-8">
          <Benefit icon={<ForkKnife size={24} weight="fill" color="#f97316" />} title="제휴 레스토랑 / 카페 할인">
            암스테르담 제휴 장소에서 멤버 할인 혜택
          </Benefit>
          <Benefit icon={<Calendar size={24} weight="fill" color="#3b82f6" />} title="학생 이벤트 우선 참가">
            이벤트 참가비 할인 혜택
          </Benefit>
          <Benefit icon={<Users size={24} weight="fill" color="#22c55e" />} title="UvA 한인 네트워크">
            암스테르담 한인 학생 커뮤니티 참여
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
  Register as Member
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
