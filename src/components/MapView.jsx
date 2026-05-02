import { useEffect, useRef } from 'react'

export default function MapView({ restaurants, selected, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (mapInstanceRef.current) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const L = window.L

      const map = L.map(mapRef.current, { zoomControl: false }).setView([52.3676, 4.9041], 13)

      // 구글맵 스타일 미니멀 타일
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19
      }).addTo(map)

      // 줌 버튼 오른쪽 아래로
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapInstanceRef.current = map
      addMarkers(L, map)
    }
    document.head.appendChild(script)
  }, [])

  const addMarkers = (L, map) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const validRestaurants = restaurants.filter(r => r.latitude && r.longitude)
    if (validRestaurants.length === 0) return

    // 커스텀 핀 스타일
    const createIcon = (isSelected) => L.divIcon({
      className: '',
      html: `
        <div style="
          width: ${isSelected ? '40px' : '32px'};
          height: ${isSelected ? '40px' : '32px'};
          background: ${isSelected ? '#2563eb' : '#1d1d1f'};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          font-size: ${isSelected ? '18px' : '14px'};
          transition: all 0.2s;
        ">🍽️</div>
      `,
      iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
      iconAnchor: [isSelected ? 20 : 16, isSelected ? 20 : 16],
    })

    validRestaurants.forEach(restaurant => {
      const marker = L.marker(
        [restaurant.latitude, restaurant.longitude],
        { icon: createIcon(false) }
      ).addTo(map)

      marker.on('click', () => onSelect(restaurant))
      markersRef.current.push(marker)
    })

    if (validRestaurants.length === 1) {
      map.setView([validRestaurants[0].latitude, validRestaurants[0].longitude], 15)
    } else {
      const bounds = L.latLngBounds(validRestaurants.map(r => [r.latitude, r.longitude]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return
    addMarkers(window.L, mapInstanceRef.current)
  }, [restaurants])

  // 선택된 식당으로 지도 이동
  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return
    mapInstanceRef.current.setView([selected.latitude, selected.longitude], 16, { animate: true })
  }, [selected])

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
  )
}