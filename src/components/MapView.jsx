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
      '카페': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M208,40H48a8,8,0,0,0-8,8V80a40,40,0,0,0,40,40h96a40,40,0,0,0,40-40V48A8,8,0,0,0,208,40Zm-8,40a24,24,0,0,1-24,24H80a24,24,0,0,1-24-24V56H200ZM80,160a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V168A8,8,0,0,0,80,160Zm48,0a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V168A8,8,0,0,0,128,160Zm48,0a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V168A8,8,0,0,0,176,160Z"/></svg>',
      '마트': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M230.14,58.87a8,8,0,0,0-6.4-3.87H56.89L50.61,28.45A8,8,0,0,0,43,22H16a8,8,0,0,0,0,16H37.22l26,112H200a8,8,0,0,0,0-16H65.6l2.14-9.28H216a8,8,0,0,0,7.87-6.4l12-56A8,8,0,0,0,230.14,58.87ZM204.35,136H64.3L56.71,102H220.59ZM88,200a16,16,0,1,1,16-16A16,16,0,0,1,88,200Zm104,0a16,16,0,1,1,16-16A16,16,0,0,1,192,200Z"/></svg>',
      '스터디': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M240,120v96a8,8,0,0,1-8,8H24a8,8,0,0,1-8-8V120a8,8,0,0,1,8-8H232A8,8,0,0,1,240,120Zm-16,8H32v80H224ZM128,40,32,88v24a8,8,0,0,1-16,0V92.8L128,24l112,68.8V112a8,8,0,0,1-16,0V88Z"/></svg>',
      '학교': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M240,96a8,8,0,0,0-4.53-7.18l-112-56a8,8,0,0,0-7.94,0l-112,56A8,8,0,0,0,16,96v8a80,80,0,0,0,80,80h64a80,80,0,0,0,80-80V96ZM128,168H96a64,64,0,0,1-64-64v-4.35L128,51.65,192,99.65V104A64,64,0,0,1,128,168Z"/></svg>',
      '기타': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a8,8,0,0,1,8,8v56a8,8,0,0,1-16,0V72A8,8,0,0,1,128,64Zm0,120a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"/></svg>',
      '전체': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-152a8,8,0,0,1,8,8v56a8,8,0,0,1-16,0V72A8,8,0,0,1,128,64Zm0,120a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"/></svg>',
      '운동': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M88,56a16,16,0,1,1,16-16A16,16,0,0,1,88,56Zm40,24a8,8,0,0,0,8-8V40a8,8,0,0,0-16,0V72A8,8,0,0,0,128,80Zm80-24a16,16,0,1,1,16-16A16,16,0,0,1,208,56Zm-36.69,85.66a8,8,0,0,0,11.32,0l28.28-28.28a8,8,0,0,0-11.32-11.32L176,118.63V80a8,8,0,0,0-16,0v38.63l-17.59-17.59a8,8,0,0,0-11.32,11.32ZM88,120a8,8,0,0,0-8,8v40a8,8,0,0,0,16,0V128A8,8,0,0,0,88,120Zm80,0a8,8,0,0,0-8,8v40a8,8,0,0,0,16,0V128A8,8,0,0,0,168,120Zm-40,40a8,8,0,0,0-8,8v40a8,8,0,0,0,16,0V168A8,8,0,0,0,128,160Z"/></svg>',
      '미용/뷰티': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V88H40V56ZM40,200V104H216v96Z"/></svg>',
      '의료': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M216,48H176V40a16,16,0,0,0-16-16H96a16,16,0,0,0-16,16v8H40A16,16,0,0,0,24,64V208a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM96,40h64v8H96ZM128,168a8,8,0,0,1-8-8V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32a8,8,0,0,1,0,16H136v24A8,8,0,0,1,128,168Z"/></svg>',
      '쇼핑': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M230.14,58.87a8,8,0,0,0-6.4-3.87H56.89L50.61,28.45A8,8,0,0,0,43,22H16a8,8,0,0,0,0,16H37.22l26,112H200a8,8,0,0,0,0-16H65.6l2.14-9.28H216a8,8,0,0,0,7.87-6.4l12-56A8,8,0,0,0,230.14,58.87ZM204.35,136H64.3L56.71,102H220.59ZM88,200a16,16,0,1,1,16-16A16,16,0,0,1,88,200Zm104,0a16,16,0,1,1,16-16A16,16,0,0,1,192,200Z"/></svg>',
      '여가': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="' + color + '"><path d="M240,120v96a8,8,0,0,1-8,8H24a8,8,0,0,1-8-8V120a8,8,0,0,1,8-8H232A8,8,0,0,1,240,120Zm-16,8H32v80H224ZM128,40,32,88v24a8,8,0,0,1-16,0V92.8L128,24l112,68.8V112a8,8,0,0,1-16,0V88Z"/></svg>'
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