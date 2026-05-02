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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19
      }).addTo(map)

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

    const createIcon = () => L.divIcon({
      className: '',
      html: '<div style="width:32px;height:32px;background:#1d1d1f;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-size:14px;">🍽️</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

    validRestaurants.forEach(restaurant => {
      const marker = L.marker([restaurant.latitude, restaurant.longitude], { icon: createIcon() }).addTo(map)
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

  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return
    mapInstanceRef.current.setView([selected.latitude, selected.longitude], 16, { animate: true })
  }, [selected])

  const locateMe = () => {
    if (!mapInstanceRef.current || !window.L) return
    const L = window.L
    mapInstanceRef.current.locate({ setView: true, maxZoom: 16 })
    mapInstanceRef.current.on('locationfound', (e) => {
      L.circleMarker(e.latlng, {
        radius: 8,
        fillColor: '#2563eb',
        color: 'white',
        weight: 2,
        fillOpacity: 1
      }).addTo(mapInstanceRef.current).bindPopup('현재 위치').openPopup()
    })
    mapInstanceRef.current.on('locationerror', () => {
      alert('위치를 가져올 수 없어요. 위치 권한을 허용해주세요.')
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
      <button
        onClick={locateMe}
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '10px',
          zIndex: 1000,
          background: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          fontSize: '18px'
        }}
        title="현재 위치"
      >
        📍
      </button>
    </div>
  )
}