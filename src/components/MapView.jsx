import { useEffect, useRef } from 'react'
import { getMapIconSvg } from '../lib/mapCategories'
import { MapPin } from 'phosphor-react'

export default function MapView({ restaurants, selected, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const markerDataRef = useRef([])
  const initializedRef = useRef(false)
  const restaurantsRef = useRef([])

  // Keep latest restaurants in a ref so script.onload can see them
  useEffect(() => {
    restaurantsRef.current = restaurants
  }, [restaurants])

  const createMarkerHtml = (r, isSelected = false) => {
    const isSponsored = r.is_sponsored
    const size = isSponsored ? 42 : 34
    const bg = isSponsored ? '#f97316' : 'white'
    const border = isSponsored
      ? '3px solid white'
      : isSelected
      ? '3px solid #f97316'
      : '2px solid #e5e7eb'
    const shadow = isSelected
      ? '0 3px 12px rgba(249,115,22,0.5)'
      : isSponsored
      ? '0 3px 12px rgba(249,115,22,0.4)'
      : '0 2px 6px rgba(0,0,0,0.15)'
    const displayName = r.map_label || r.name || ''
    const name = displayName.length > 12 ? displayName.slice(0, 12) + '…' : displayName
    const iconColor = isSponsored ? 'white' : '#f97316'
    const iconSvg = getMapIconSvg(r.category, iconColor)

    return (
      '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">' +
      '<div style="width:' +
      size +
      'px;height:' +
      size +
      'px;background:' +
      bg +
      ';border:' +
      border +
      ';border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:' +
      shadow +
      ';flex-shrink:0;">' +
      '<div style="width:' +
      (isSponsored ? 24 : 16) +
      'px;height:' +
      (isSponsored ? 24 : 16) +
      'px;display:flex;align-items:center;justify-content:center;">' +
      iconSvg +
      '</div>' +
      '</div>' +
      '<div style="background:white;color:#374151;font-size:9px;font-weight:600;padding:1px 4px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:90px;overflow:hidden;text-overflow:ellipsis;">' +
      name +
      '</div>' +
      '</div>'
    )
  }

  const renderMarkers = (L, map, data) => {
    if (!L || !map) return

    // Clear old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    markerDataRef.current = []

    const valid = (data || []).filter((r) => r.latitude && r.longitude)
    if (valid.length === 0) return

    const sorted = [...valid].sort(
      (a, b) => (a.is_sponsored ? 1 : 0) - (b.is_sponsored ? 1 : 0)
    )

    sorted.forEach((r) => {
      const size = r.is_sponsored ? 42 : 34
      const iconWidth = size + 20
      const iconHeight = size + 28
      
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: createMarkerHtml(r, false),
        iconSize: [iconWidth, iconHeight],
        iconAnchor: [iconWidth / 2, size / 2],
        popupAnchor: [0, -(size / 2)],
      })

      const m = L.marker([r.latitude, r.longitude], { icon: markerIcon }).addTo(map)
      m.on('click', () => onSelect(r))
      markersRef.current.push(m)
      markerDataRef.current.push({ r, marker: m })
    })

    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], 15)
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(valid.map((r) => [r.latitude, r.longitude]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }

  // Load Leaflet and initialize map once
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
      if (!mapRef.current) return

      const map = L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        dragging: true,
        tap: true,
      }).setView([52.3676, 4.9041], 13)

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '© OpenStreetMap © CARTO',
          maxZoom: 19,
        }
      ).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapInstanceRef.current = map

      // Draw markers if we already have data
      renderMarkers(L, map, restaurantsRef.current)
    }
    document.head.appendChild(script)
  }, [])

  // Re-render markers when restaurants change (and map is ready)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return
    renderMarkers(window.L, mapInstanceRef.current, restaurants)
  }, [restaurants])

  // Update marker selection state
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return
    const L = window.L
    markerDataRef.current.forEach(({ r, marker }) => {
      const isSelected = selected && r.id === selected.id
      const size = r.is_sponsored ? 42 : 34
      const iconWidth = size + 20
      const iconHeight = size + 28
      
      marker.setIcon(
        L.divIcon({
          className: 'custom-marker',
          html: createMarkerHtml(r, isSelected),
          iconSize: [iconWidth, iconHeight],
          iconAnchor: [iconWidth / 2, size / 2],
          popupAnchor: [0, -(size / 2)],
        })
      )
    })
  }, [selected])

  // Center map on selected spot
  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return
    mapInstanceRef.current.setView(
      [selected.latitude, selected.longitude],
      16,
      { animate: true }
    )
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
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('현재 위치')
        .openPopup()
    })

    map.once('locationerror', () => {
      alert('위치를 가져올 수 없어요. 위치 권한을 허용해주세요.')
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', minHeight: '300px', zIndex: 1 }}
      />
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="현재 위치"
      >
        <MapPin size={20} weight="fill" color="#f97316" />
      </button>
    </div>
  )
}