import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import { supabase } from '../lib/supabase'
import { SpotCard, RichText } from '../components/SpotCard'
import { MAP_CATEGORIES, getMapIconSvg } from '../lib/mapCategories'
import { MapPin, Lock } from 'phosphor-react'

export default function PublicPage() {
  const [activeTab, setActiveTab] = useState('map')
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
      className="flex flex-col bg-gray-50 overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* 헤더 */}
      <div
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
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
      <div
        className="bg-white border-t border-gray-100 flex flex-shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {[
          { key: 'map', label: 'SPOT', icon: MapPin },
          { key: 'membership', label: 'Membership', icon: Lock },
        ].map((tab) => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                'flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ' +
                (activeTab === tab.key ? 'text-orange-500' : 'text-gray-400')
              }
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

  const categories = MAP_CATEGORIES

  const filtered =
    activeCategory === '전체'
      ? restaurants
      : restaurants.filter((r) => r.category === activeCategory)

  return (
    <div className="h-full flex flex-col">
      {/* 카테고리 바 */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
        {categories.map((cat) => {
          const isActive = activeCategory === cat
          const iconSvg = getMapIconSvg(cat, isActive ? 'white' : '#f97316')
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat)
                setSelected(null)
              }}
              className={
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ' +
                (isActive
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
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

      {/* 지도 / 빈 상태 */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {(() => {
              const iconSvg = getMapIconSvg(activeCategory, '#f97316')
              return (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    margin: '0 auto 8px',
                  }}
                  dangerouslySetInnerHTML={{ __html: iconSvg }}
                />
              )
            })()}
            <p className="text-gray-500 text-sm">등록된 장소가 없어요</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <MapView
            restaurants={filtered}
            selected={selected}
            onSelect={setSelected}
          />
          {selected && (
            <SpotCard selected={selected} onClose={() => setSelected(null)} />
          )}
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            UvA-IN Membership
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            UvA-IN 멤버십에 가입하고 다양한 혜택을 누리세요!
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <span className="text-2xl">🍽️</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                제휴 레스토랑 / 카페 할인
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                암스테르담 내 제휴 장소에서 멤버십 할인 혜택
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                학생회 이벤트 우선 참가
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                이벤트 참가비 무료 및 할인 혜택
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <span className="text-2xl">🤝</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                UvA 한인 네트워크
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                암스테르담 한인 학생 커뮤니티 참여
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full bg-orange-500 text-white font-semibold py-3 rounded-2xl hover:bg-orange-600 transition-colors"
        >
          로그인
        </button>
      </div>
    </div>
  )
}