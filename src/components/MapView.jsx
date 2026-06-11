import { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import '@maptiler/sdk/dist/maptiler-sdk.css'

// Optimize map rendering
if (typeof window !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .maplibregl-canvas { image-rendering: optimizeSpeed; }
  `
  document.head.appendChild(style)
}
import { getMapIconSvg } from '../lib/mapCategories'
import { MapPin } from '@phosphor-icons/react'

// Set your API key
const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY
maptilersdk.config.apiKey = API_KEY

export default function MapView({ restaurants, selected, onSelect }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const markerDataRef = useRef([])
  const initializedRef = useRef(false)

  // ─── Helper: Create marker element ──────────────────────────────────────
  const createMarkerElement = (r, isSelected = false) => {
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

    const el = document.createElement('div')
    el.className = 'custom-marker'
    el.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      cursor: pointer;
    `

    const markerCircle = document.createElement('div')
    markerCircle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${bg};
      border: ${border};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${shadow};
      flex-shrink: 0;
    `

    const iconContainer = document.createElement('div')
    iconContainer.style.cssText = `
      width: ${isSponsored ? 24 : 16}px;
      height: ${isSponsored ? 24 : 16}px;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    iconContainer.innerHTML = iconSvg
    markerCircle.appendChild(iconContainer)

    const label = document.createElement('div')
    label.style.cssText = `
      background: white;
      color: #374151;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 4px;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
    `
    label.textContent = name

    el.appendChild(markerCircle)
    el.appendChild(label)

    return el
  }

  // ─── Render all markers ────────────────────────────────────────────────
  const renderMarkers = (mapInstance, data) => {
    if (!mapInstance) return

    // Guard: skip if IDs haven't changed
    const newIds = (data || [])
      .filter((r) => r.latitude && r.longitude)
      .map((r) => r.id)
      .join(',')
    const oldIds = markerDataRef.current.map((d) => d.r.id).join(',')
    if (newIds === oldIds) return

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    markerDataRef.current = []

    const valid = (data || []).filter((r) => r.latitude && r.longitude)
    if (valid.length === 0) return

    const sorted = [...valid].sort(
      (a, b) => (a.is_sponsored ? 1 : 0) - (b.is_sponsored ? 1 : 0)
    )

    sorted.forEach((r) => {
      const el = createMarkerElement(r, false)
      const marker = new maptilersdk.Marker({ element: el })
        .setLngLat([r.longitude, r.latitude])
        .addTo(mapInstance)

      el.addEventListener('click', () => onSelect(r))

      marker._isSelected = false
      marker._restaurant = r
      markersRef.current.push(marker)
      markerDataRef.current.push({ r, marker })
    })

    // Fit bounds
    if (valid.length === 1) {
      mapInstance.flyTo({
        center: [valid[0].longitude, valid[0].latitude],
        zoom: 15,
        duration: 1000,
      })
    } else if (valid.length > 1) {
      const bounds = valid.reduce(
        (b, r) => b.extend([r.longitude, r.latitude]),
        new maptilersdk.LngLatBounds(
          [valid[0].longitude, valid[0].latitude],
          [valid[0].longitude, valid[0].latitude]
        )
      )
      mapInstance.fitBounds(bounds, { padding: 40, duration: 1000 })
    }
  }

  // ─── Initialize map once ──────────────────────────────────────────────
useEffect(() => {
  if (initializedRef.current || !mapContainer.current) return
  initializedRef.current = true

  // Delay map initialization slightly to let page render first
  const timer = setTimeout(() => {
    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/019eb88d-92dc-70b4-b9c2-008b7e4a977d/style.json?key=${API_KEY}`,
      center: [4.9041, 52.3676],
      zoom: 13,
      attributionControl: false,
      optimizeForTerrain: false, // Disable terrain optimization
      preserveDrawingBuffer: false, // Disable screenshot capability
    })

    map.current.addControl(new maptilersdk.FullscreenControl())
    map.current.addControl(new maptilersdk.NavigationControl())
    map.current.addControl(new maptilersdk.GeolocateControl())
  }, 100)

  return () => clearTimeout(timer)
}, [])

  // ─── Re-render markers when restaurants list changes ──────────────────
  useEffect(() => {
    if (!map.current) return
    renderMarkers(map.current, restaurants)
  }, [restaurants])

  // ─── Update ONLY the affected markers when selection changes ──────────
  useEffect(() => {
    if (!map.current) return

    markerDataRef.current.forEach(({ r, marker }) => {
      const isSelected = !!(selected && r.id === selected.id)

      if (marker._isSelected === isSelected) return

      marker._isSelected = isSelected
      const newEl = createMarkerElement(r, isSelected)
      marker.setElement(newEl)

      // Re-attach click listener
      newEl.addEventListener('click', () => onSelect(r))
    })
  }, [selected])

  // ─── Pan to selected spot ──────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !selected) return
    map.current.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: 16,
      duration: 1000,
    })
  }, [selected])

  // ─── Locate me button ──────────────────────────────────────────────────
  const locateMe = () => {
    if (!map.current) return

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            duration: 1000,
          })

          // Add a marker for current location
          const el = document.createElement('div')
          el.style.cssText = `
            width: 16px;
            height: 16px;
            background: #f97316;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          `
          new maptilersdk.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .setPopup(new maptilersdk.Popup().setText('현재 위치'))
            .addTo(map.current)
            .getPopup()
            .addTo(map.current)
        },
        () => {
          alert('위치를 가져올 수 없어요. 위치 권한을 허용해주세요.')
        }
      )
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '300px',
          zIndex: 1,
        }}
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