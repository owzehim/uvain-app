function MapTab({ restaurants }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState('전체')

  const categories = ['전체', '맛집', '미용실', '헬스장', '한국마트', '카페', '기타']
  
  const categoryIcons = {
    '맛집': '🍽️', '미용실': '💇', '헬스장': '💪',
    '한국마트': '🛒', '카페': '☕', '기타': '📍', '전체': '🗺️'
  }

  const filtered = activeCategory === '전체'
    ? restaurants
    : restaurants.filter(r => r.category === activeCategory)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* 카테고리 필터 */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSelected(null) }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {categoryIcons[cat]} {cat}
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
        <>
          <div className="flex-1">
            <MapView
              restaurants={filtered}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          {selected && (
            <div className="bg-white border-t border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {categoryIcons[selected.category]} {selected.category || '맛집'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 mt-1">{selected.name}</p>
                  {selected.address && (
                    <p className="text-sm text-gray-500 mt-0.5">📍 {selected.address}</p>
                  )}
                  {selected.discount_info && (
                    <p className="text-sm text-blue-600 mt-0.5">🎟 {selected.discount_info}</p>
                  )}
                  {selected.rating > 0 && (
                    <p className="text-sm text-amber-500 mt-0.5">
                      {'★'.repeat(Math.round(selected.rating))} {selected.rating}
                    </p>
                  )}
                  {selected.review && (
                    <p className="text-sm text-gray-600 mt-1">{selected.review}</p>
                  )}
                  {selected.reviewer_name && (
                    <p className="text-xs text-gray-400 mt-0.5">— {selected.reviewer_name}</p>
                  )}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700">
                    Google Maps에서 열기
                  </a>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600 ml-4 text-lg"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}