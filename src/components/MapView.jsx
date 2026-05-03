import { useEffect, useRef } from 'react'

export default function MapView({ restaurants, selected, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const initializedRef = useRef(false)

  const categoryIcons = {
    '맛집': '🍽️', '카페': '☕', '한국마트': '🛒',
    '미용실': '💇', '헬스장': '💪', '기타': '📍'
  }

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const L = window.L

      const map = L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        dragging: true,
        tap: true,
      }).setView([52.3676, 4.9041], 13)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapInstanceRef.current = map
      renderMarkers(L, map, restaurants)
    }
    document.head.appendChild(script)
  }, [])

  const renderMarkers = (L, map, data) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const valid = data.filter(r => r.latitude && r.longitude)
    if (valid.length === 0) return

    valid.forEach(r => {
      const icon = categoryIcons[r.category] || '📍'
      const marker = L.divIcon({
        className: '',
        html: '<div style="width:34px;height:34px;background:#1d1d1f;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-size:15px;">' + icon + '</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })

      const m = L.marker([r.latitude, r.longitude], { icon: marker }).addTo(map)
      m.on('click', () => onSelect(r))
      markersRef.current.push(m)
    })

    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], 15)
    } else {
      const bounds = L.latLngBounds(valid.map(r => [r.latitude, r.longitude]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return
    renderMarkers(window.L, mapInstanceRef.current, restaurants)
  }, [restaurants])

  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return
    mapInstanceRef.current.setView([selected.latitude, selected.longitude], 16, { animate: true })
  }, [selected])

  const locateMe = () => {
    if (!mapInstanceRef.current || !window.L) return
    const L = window.L
    const map = mapInstanceRef.current
    map.locate({ setView: true, maxZoom: 16 })
    map.once('locationfound', (e) => {
      L.circleMarker(e.latlng, {
        radius: 8, fillColor: '#f97316',
        color: 'white', weight: 2, fillOpacity: 1
      }).addTo(map).bindPopup('현재 위치').openPopup()
    })
    map.once('locationerror', () => {
      alert('위치를 가져올 수 없어요. 위치 권한을 허용해주세요.')
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
      <button
        onClick={locateMe}
        style={{
          position: 'absolute', bottom: '80px', right: '10px',
          zIndex: 1000, background: 'white', border: 'none',
          borderRadius: '8px', padding: '8px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer', fontSize: '18px'
        }}
        title="현재 위치"
      >
        📍
      </button>
    </div>
  )
}