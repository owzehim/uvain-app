import { useEffect, useRef } from 'react'
import { MapPin, ForkKnife, Coffee, ShoppingCart, Books, GraduationCap, FirstAid, Barbell, Sparkle, GameController, ShoppingBag } from 'phosphor-react'

export default function MapView({ restaurants, selected, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const markerDataRef = useRef([])
  const initializedRef = useRef(false)

  const categoryIcons = {
    '맛집': ForkKnife,
    '카페': Coffee,
    '마트': ShoppingCart,
    '스터디': Books,
    '학교': GraduationCap,
    '기타': MapPin,
    '전체': MapPin,
    '운동': Barbell,
    '미용/뷰티': Sparkle,
    '의료': FirstAid,
    '쇼핑': ShoppingBag,
    '여가': GameController
  }

  const getPhosphorSvg = (category, color = 'white') => {
    const iconMap = {
  '맛집': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M232,80a8,8,0,0,0-8-8H216V56a8,8,0,0,0-16,0V72H152V56a8,8,0,0,0-16,0V72H88V56a8,8,0,0,0-16,0V72H32a8,8,0,0,0-8,8v96a8,8,0,0,0,8,8H48v32a8,8,0,0,0,16,0V184h96v32a8,8,0,0,0,16,0V184h16a8,8,0,0,0,8-8V80Zm-16,88H40V88H216Z"/></svg>',
  '카페': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm40,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,160,64Zm64,56v8a40,40,0,0,1-37.51,39.9A96.06,96.06,0,0,1,96,256H72a8,8,0,0,1,0-16H96a80.09,80.09,0,0,0,79.6-72H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H216A8,8,0,0,1,224,80v32A8,8,0,0,0,224,120Zm-16-32H56v24H208Zm32,32a24,24,0,0,1-16,22.62V110.22A24,24,0,0,1,240,120Z"/></svg>',
  '마트': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M230.14,58.87a8,8,0,0,0-6.4-3.87H56.89L50.61,28.45A8,8,0,0,0,43,22H16a8,8,0,0,0,0,16H37.22l26,112H200a8,8,0,0,0,0-16H65.6l-2.78-12H216a8,8,0,0,0,7.87-6.4l12-56A8,8,0,0,0,230.14,58.87ZM88,200a16,16,0,1,1-16-16A16,16,0,0,1,88,200Zm104,0a16,16,0,1,1-16-16A16,16,0,0,1,192,200Z"/></svg>',
  '스터디': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M201.54,54.54A104,104,0,1,0,232,128,103.44,103.44,0,0,0,201.54,54.54ZM128,216a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V104a8,8,0,0,1,16,0v32a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>',
  '학교': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M240,96a8,8,0,0,0-4.53-7.18l-112-56a8,8,0,0,0-7.94,0l-112,56A8,8,0,0,0,16,96v8a80,80,0,0,0,80,80h64a80,80,0,0,0,80-80V96ZM128,168H96a64,64,0,0,1-64-64v-4.35L128,51.65,192,99.65V104A64,64,0,0,1,128,168Z"/></svg>',
  '운동': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M248,120h-8V88a16,16,0,0,0-16-16H208a16,16,0,0,0-16,16v32H64V88A16,16,0,0,0,48,72H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48a16,16,0,0,0,16-16V136H192v32a16,16,0,0,0,16,16h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM48,168H32V88H48Zm176,0H208V88h16Z"/></svg>',
  '미용/뷰티': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M212.44,103.28A84,84,0,0,0,128,32C83.35,32,44.28,66.46,40.12,110.71A84.07,84.07,0,0,0,91.28,212.44a8,8,0,0,0,10.72-7.53V192a8,8,0,0,0-16,0v8.32A68,68,0,0,1,56,128a72,72,0,0,1,144,0,68,68,0,0,1-30,56.32V192a8,8,0,0,0-16,0v12.91a8,8,0,0,0,10.72,7.53,84.07,84.07,0,0,0,51.16-101.73A84.42,84.42,0,0,0,212.44,103.28ZM128,72a8,8,0,0,1,8,8v48a8,8,0,0,1-16,0V80A8,8,0,0,1,128,72Z"/></svg>',
  '의료': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M216,48H176V40a16,16,0,0,0-16-16H96a16,16,0,0,0-16,16v8H40A16,16,0,0,0,24,64V208a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM96,40h64v8H96ZM128,168a8,8,0,0,1-8-8V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32a8,8,0,0,1,0,16H136v24A8,8,0,0,1,128,168Z"/></svg>',
  '쇼핑': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M222.14,58.87A8,8,0,0,0,216,56H54.68L49.79,29.14A16,16,0,0,0,34.05,16H16a8,8,0,0,0,0,16H34.05l32.51,168.86A24,24,0,1,0,98.95,216a23.84,23.84,0,0,0-3-11.59l81.66.59A24,24,0,1,0,200,192a23.84,23.84,0,0,0,3,11.59l-1.3,0a8,8,0,0,0,0,16l1.3,0A24,24,0,0,0,200,192H98.95A8,8,0,0,0,88,200a8,8,0,1,1-8-8H216a8,8,0,0,0,7.86-6.57l16-96A8,8,0,0,0,222.14,58.87Z"/></svg>',
  '여가': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M206,128l-96,56V72Zm40-80H10A10,10,0,0,0,0,58V198a10,10,0,0,0,10,10H246a10,10,0,0,0,10-10V58A10,10,0,0,0,246,48ZM236,188H20V68H236Z"/></svg>',
  '기타': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a8,8,0,0,1,8,8v56a8,8,0,0,1-16,0V72A8,8,0,0,1,128,64Zm0,120a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"/></svg>',
  '전체': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a8,8,0,0,1,8,8v56a8,8,0,0,1-16,0V72A8,8,0,0,1,128,64Zm0,120a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"/></svg>'
}
    return iconMap[category] || iconMap['기타']
  }

  const createMarkerHtml = (r, isSelected = false) => {
    const isSponsored = r.is_sponsored
    const size = isSponsored ? 42 : 34
    const bg = isSponsored ? '#f97316' : 'white'
    const border = isSponsored ? '3px solid white' : isSelected ? '3px solid #f97316' : '2px solid #e5e7eb'
    const shadow = isSelected ? '0 3px 12px rgba(249,115,22,0.5)' : isSponsored ? '0 3px 12px rgba(249,115,22,0.4)' : '0 2px 6px rgba(0,0,0,0.15)'
    const displayName = r.map_label || r.name || ''
    const name = displayName.length > 12 ? displayName.slice(0, 12) + '…' : displayName
    const iconColor = isSponsored ? 'white' : '#f97316'
    const iconSvg = getPhosphorSvg(r.category, iconColor)

    return (
      '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">' +
      '<div style="width:' + size + 'px;height:' + size + 'px;background:' + bg + ';border:' + border + ';border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:' + shadow + ';">' +
      '<div style="width:' + (isSponsored ? 20 : 16) + 'px;height:' + (isSponsored ? 20 : 16) + 'px;">' + iconSvg + '</div>' +
      '</div>' +
      '<div style="background:white;color:#374151;font-size:9px;font-weight:600;padding:1px 4px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:90px;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>' +
      '</div>'
    )
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
    markerDataRef.current = []

    const valid = data.filter(r => r.latitude && r.longitude)
    if (valid.length === 0) return

    const sorted = [...valid].sort((a, b) => (a.is_sponsored ? 1 : 0) - (b.is_sponsored ? 1 : 0))

    sorted.forEach(r => {
      const size = r.is_sponsored ? 42 : 34
      const markerIcon = L.divIcon({
        className: '',
        html: createMarkerHtml(r, false),
        iconSize: [size + 20, size + 28],
        iconAnchor: [(size + 20) / 2, size / 2],
      })

      const m = L.marker([r.latitude, r.longitude], { icon: markerIcon }).addTo(map)
      m.on('click', () => onSelect(r))
      markersRef.current.push(m)
      markerDataRef.current.push({ r, marker: m })
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
    if (!mapInstanceRef.current || !window.L) return
    const L = window.L
    markerDataRef.current.forEach(({ r, marker }) => {
      const isSelected = selected && r.id === selected.id
      const size = r.is_sponsored ? 42 : 34
      marker.setIcon(L.divIcon({
        className: '',
        html: createMarkerHtml(r, isSelected),
        iconSize: [size + 20, size + 28],
        iconAnchor: [(size + 20) / 2, size / 2],
      }))
    })
  }, [selected])

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
        radius: 8,
        fillColor: '#f97316',
        color: 'white',
        weight: 2,
        fillOpacity: 1
      }).addTo(map).bindPopup('현재 위치').openPopup()
    })
    map.once('locationerror', () => {
      alert('위치를 가져올 수 없어요. 위치 권한을 허용해주세요.')
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px', zIndex: 1 }} />
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