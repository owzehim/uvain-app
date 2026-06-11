import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getMapIconSvg } from '../lib/mapCategories'
import { MapPin } from '@phosphor-icons/react'

export default function MapView({ restaurants, selected, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const markerDataRef = useRef([])
  const initializedRef = useRef(false)

  // ─── Helper: build marker HTML ───────────────────────────────────────────
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
    const name =
      displayName.length > 12 ? displayName.slice(0, 12) + '…' : displayName
    const iconColor = isSponsored ? 'white' : '#f97316'
    const iconSvg = getMapIconSvg(r.category, iconColor)

    return (
      '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">' +
      '<div style="width:' + size + 'px;height:' + size + 'px;background:' + bg +
      ';border:' + border + ';border-radius:50%;display:flex;align-items:center;' +
      'justify-content:center;box-shadow:' + shadow + ';flex-shrink:0;">' +
      '<div style="width:' + (isSponsored ? 24 : 16) + 'px;height:' +
      (isSponsored ? 24 : 16) + 'px;display:flex;align-items:center;justify-content:center;">' +
      iconSvg + '</div></div>' +
      '<div style="background:white;color:#374151;font-size:9px;font-weight:600;' +
      'padding:1px 4px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);' +
      'max-width:90px;overflow:hidden;text-overflow:ellipsis;">' + name + '</div></div>'
    )
  }

  // ─── Render all markers (only called when the list changes) ──────────────
  const renderMarkers = (map, data) => {
    if (!map) return

    // Guard: skip if IDs haven't changed
    const newIds = (data || [])
      .filter((r) => r.latitude && r.longitude)
      .map((r) => r.id)
      .join(',')
    const oldIds = markerDataRef.current.map((d) => d.r.id).join(',')
    if (newIds === oldIds) return

    // Remove old markers
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
      // Track selection state on the marker object itself
      m._isSelected = false
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

  // ─── Initialize map once ─────────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current || !mapRef.current) return
    initializedRef.current = true

    const map = L.map(mapRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
      dragging: true,
      tap: true,
    }).setView([52.3676, 4.9041], 13)

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
    ).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapInstanceRef.current = map
  }, [])

  // ─── Re-render markers when restaurants list changes ─────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return
    renderMarkers(mapInstanceRef.current, restaurants)
  }, [restaurants])

  // ─── Update ONLY the 2 affected markers when selection changes ───────────
  useEffect(() => {
    if (!mapInstanceRef.current) return

    markerDataRef.current.forEach(({ r, marker }) => {
      const isSelected = !!(selected && r.id === selected.id)

      // Skip if selection state hasn't changed for this marker
      if (marker._isSelected === isSelected) return
      marker._isSelected = isSelected

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

  // ─── Pan to selected spot ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return
    mapInstanceRef.current.setView(
      [selected.latitude, selected.longitude],
      16,
      { animate: true }
    )
  }, [selected])

  // ─── Locate me button ─────────────────────────────────────────────────────
  const locateMe = () => {
    const map = mapInstanceRef.current
    if (!map) return

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
