import { useEffect, useRef, useCallback, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'

import { getMapIconSvg, MAP_CATEGORIES } from '../lib/mapCategories'
import { MapPinSimple } from '@phosphor-icons/react'

if (typeof window !== 'undefined' && !document.getElementById('map-view-performance-style')) {
  const style = document.createElement('style')
  style.id = 'map-view-performance-style'
  style.textContent = `
    .maplibregl-canvas { image-rendering: optimizeSpeed; }
    .maplibregl-ctrl-top-left { display: none !important; }
    .maplibregl-ctrl-top-right { display: none !important; }
    .maplibregl-ctrl-bottom-left { display: none !important; }
    .maplibregl-ctrl-bottom-right { display: none !important; }
  `
  document.head.appendChild(style)
}

const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY
const LIGHT_MAP_STYLE_ID = '019eb88d-92dc-70b4-b9c2-008b7e4a977d'
const DARK_MAP_STYLE_ID = '019e33af-3185-79df-9f26-1bc6d896eeee'

const SPOTS_SOURCE_ID = 'uvain-spots'
const SPOTS_CIRCLE_LAYER_ID = 'uvain-spots-circles'
const SPOTS_ICON_LAYER_ID = 'uvain-spots-icons'
const SPOTS_LABEL_LAYER_ID = 'uvain-spots-labels'
const SPOT_ICON_PREFIX = 'uvain-spot-icon-'
const SPOT_INTERACTIVE_LAYER_IDS = [
  SPOTS_CIRCLE_LAYER_ID,
  SPOTS_ICON_LAYER_ID,
  SPOTS_LABEL_LAYER_ID,
]

maptilersdk.config.apiKey = API_KEY

function getMapStyleUrl(isDark) {
  const styleId = isDark ? DARK_MAP_STYLE_ID : LIGHT_MAP_STYLE_ID
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${API_KEY}`
}

function isDarkMode() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

function getIconId(category, isSponsored, dark) {
  const color = isSponsored ? (dark ? '#121212' : 'white') : '#f97316'
  return `${SPOT_ICON_PREFIX}${category || 'default'}-${color.replace('#', '')}`
}

function createImageFromSvg(svg) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

function buildSpotFeatures(restaurants, selectedId, dark) {
  return {
    type: 'FeatureCollection',
    features: (restaurants || [])
      .filter((r) => r.latitude && r.longitude)
      .map((r) => {
        const isSponsored = !!r.is_sponsored
        const isSelected = r.id === selectedId
        const label = r.map_label || r.name || ''

        return {
          type: 'Feature',
          id: r.id,
          geometry: {
            type: 'Point',
            coordinates: [Number(r.longitude), Number(r.latitude)],
          },
          properties: {
            id: r.id,
            label,
            category: r.category || 'default',
            isSponsored,
            isSelected,
            iconId: getIconId(r.category, isSponsored, dark),
            circleSize: isSponsored ? 42 : 34,
            iconSize: isSponsored ? 24 : 16,
            circleColor: isSponsored ? '#f97316' : dark ? '#121212' : 'white',
            circleStrokeColor: isSelected
              ? '#f97316'
              : isSponsored
                ? dark ? '#121212' : 'white'
                : dark ? '#f97316' : '#e5e7eb',
            circleStrokeWidth: isSponsored || isSelected ? 3 : 2,
            labelColor: dark ? '#ffffff' : '#374151',
            labelHaloColor: dark ? '#121212' : 'white',
          },
        }
      }),
  }
}

function getExistingInteractiveLayerIds(mapInstance) {
  return SPOT_INTERACTIVE_LAYER_IDS.filter((layerId) => mapInstance.getLayer(layerId))
}

export default function MapView({ restaurants, selected, onSelect }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const userLocationMarkerRef = useRef(null)
  const locationWatchIdRef = useRef(null)
  const initializedRef = useRef(false)
  const mapReadyRef = useRef(false)
  const activeStyleRef = useRef(null)
  const restaurantsRef = useRef(restaurants)
  const selectedRef = useRef(selected)
  const onSelectRef = useRef(onSelect)
  const iconLoadRef = useRef(new Set())
  const [isTrackingLocation, setIsTrackingLocation] = useState(false)
  const [darkMapControls, setDarkMapControls] = useState(isDarkMode)

  useEffect(() => {
    restaurantsRef.current = restaurants
  }, [restaurants])

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const loadMarkerIcons = useCallback(async () => {
    if (!map.current) return
    const dark = isDarkMode()
    const categories = new Set([
      ...MAP_CATEGORIES,
      ...(restaurantsRef.current || []).map((r) => r.category || 'default'),
    ])

    await Promise.all(
      Array.from(categories).flatMap((category) => {
        return [false, true].map(async (isSponsored) => {
          const iconId = getIconId(category, isSponsored, dark)
          if (!map.current || map.current.hasImage(iconId) || iconLoadRef.current.has(iconId)) {
            return
          }

          iconLoadRef.current.add(iconId)
          const color = isSponsored ? (dark ? '#121212' : 'white') : '#f97316'
          const image = await createImageFromSvg(getMapIconSvg(category, color))
          if (map.current && !map.current.hasImage(iconId)) {
            map.current.addImage(iconId, image, { sdf: false, pixelRatio: 2 })
          }
        })
      }),
    )
  }, [])

  const ensureSpotLayers = useCallback(async () => {
    if (!map.current) return

    await loadMarkerIcons()

    if (!map.current.getSource(SPOTS_SOURCE_ID)) {
      map.current.addSource(SPOTS_SOURCE_ID, {
        type: 'geojson',
        data: buildSpotFeatures([], null, isDarkMode()),
      })
    }

    if (!map.current.getLayer(SPOTS_CIRCLE_LAYER_ID)) {
      map.current.addLayer({
        id: SPOTS_CIRCLE_LAYER_ID,
        type: 'circle',
        source: SPOTS_SOURCE_ID,
        paint: {
          'circle-radius': ['/', ['get', 'circleSize'], 2],
          'circle-color': ['get', 'circleColor'],
          'circle-stroke-color': ['get', 'circleStrokeColor'],
          'circle-stroke-width': ['get', 'circleStrokeWidth'],
          'circle-blur': 0,
        },
      })
    }

    if (!map.current.getLayer(SPOTS_ICON_LAYER_ID)) {
      map.current.addLayer({
        id: SPOTS_ICON_LAYER_ID,
        type: 'symbol',
        source: SPOTS_SOURCE_ID,
        layout: {
          'icon-image': ['get', 'iconId'],
          'icon-size': ['/', ['get', 'iconSize'], 16],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      })
    }

    if (!map.current.getLayer(SPOTS_LABEL_LAYER_ID)) {
      map.current.addLayer({
        id: SPOTS_LABEL_LAYER_ID,
        type: 'symbol',
        source: SPOTS_SOURCE_ID,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 9,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
          'text-anchor': 'top',
          'text-offset': [0, 2.4],
          'text-max-width': 100,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['get', 'labelColor'],
          'text-halo-color': ['get', 'labelHaloColor'],
          'text-halo-width': 2,
          'text-halo-blur': 0.5,
        },
      })
    }
  }, [loadMarkerIcons])

  const syncSpotLayers = useCallback(async (data, { fitBounds = false } = {}) => {
    if (!map.current || !mapReadyRef.current) return

    await ensureSpotLayers()

    const valid = (data || []).filter((r) => r.latitude && r.longitude)
    const source = map.current.getSource(SPOTS_SOURCE_ID)
    source?.setData(buildSpotFeatures(valid, selectedRef.current?.id ?? null, isDarkMode()))

    if (!fitBounds || valid.length === 0) return

    if (valid.length === 1) {
      map.current.flyTo({
        center: [valid[0].longitude, valid[0].latitude],
        zoom: 15,
        duration: 1000,
      })
      return
    }

    const bounds = valid.reduce(
      (b, r) => b.extend([r.longitude, r.latitude]),
      new maptilersdk.LngLatBounds(
        [valid[0].longitude, valid[0].latitude],
        [valid[0].longitude, valid[0].latitude],
      ),
    )
    map.current.fitBounds(bounds, { padding: 40, duration: 1000 })
  }, [ensureSpotLayers])

  useEffect(() => {
    if (initializedRef.current || !mapContainer.current) return
    initializedRef.current = true

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: getMapStyleUrl(isDarkMode()),
      center: [4.9041, 52.3676],
      zoom: 13,
      antialias: false,
      attributionControl: false,
      fadeDuration: 0,
      optimizeForTerrain: false,
      preserveDrawingBuffer: false,
      pitch: 0,
      bearing: 0,
    })

    map.current.dragRotate.disable()
    map.current.touchZoomRotate.disableRotation()

    const handleSpotClick = (event) => {
      if (!map.current) return
      const layers = getExistingInteractiveLayerIds(map.current)
      if (layers.length === 0) return
      const feature = map.current.queryRenderedFeatures(event.point, {
        layers,
      })?.[0]
      const id = feature?.properties?.id
      const spot = restaurantsRef.current?.find((r) => String(r.id) === String(id))
      if (spot) onSelectRef.current?.(spot)
    }

    const handlePointerMove = (event) => {
      if (!map.current) return
      const layers = getExistingInteractiveLayerIds(map.current)
      if (layers.length === 0) {
        map.current.getCanvas().style.cursor = ''
        return
      }
      const features = map.current.queryRenderedFeatures(event.point, {
        layers,
      })
      map.current.getCanvas().style.cursor = features.length ? 'pointer' : ''
    }

    map.current.on('load', async () => {
      mapReadyRef.current = true
      activeStyleRef.current = getMapStyleUrl(isDarkMode())
      await syncSpotLayers(restaurantsRef.current, { fitBounds: true })
      map.current?.on('click', handleSpotClick)
      map.current?.on('mousemove', handlePointerMove)
      map.current?.on('mouseout', () => {
        if (map.current) map.current.getCanvas().style.cursor = ''
      })
    })

    return () => {
      map.current?.remove()
      map.current = null
      initializedRef.current = false
      mapReadyRef.current = false
    }
  }, [syncSpotLayers])

  useEffect(() => {
    if (!map.current || typeof MutationObserver === 'undefined') return undefined

    const syncMapStyle = () => {
      setDarkMapControls(isDarkMode())
      const nextStyle = getMapStyleUrl(isDarkMode())
      if (activeStyleRef.current === nextStyle) {
        syncSpotLayers(restaurantsRef.current)
        return
      }

      activeStyleRef.current = nextStyle
      mapReadyRef.current = false
      iconLoadRef.current.clear()
      map.current.setStyle(nextStyle)
      map.current.once('style.load', async () => {
        mapReadyRef.current = true
        await syncSpotLayers(restaurantsRef.current)
      })
    }

    const observer = new MutationObserver(syncMapStyle)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    syncMapStyle()

    return () => observer.disconnect()
  }, [syncSpotLayers])

  useEffect(() => {
    if (mapReadyRef.current) {
      syncSpotLayers(restaurants, { fitBounds: true })
    }
  }, [restaurants, syncSpotLayers])

  useEffect(() => {
    if (!map.current || !mapReadyRef.current) return
    syncSpotLayers(restaurantsRef.current)

    if (!selected) return
    map.current.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: 16,
      duration: 1000,
    })
  }, [selected, syncSpotLayers])

  const removeUserLocationMarker = useCallback(() => {
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove()
      userLocationMarkerRef.current = null
    }
  }, [])

  const stopLocationTracking = useCallback(() => {
    if (locationWatchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current)
      locationWatchIdRef.current = null
    }
    removeUserLocationMarker()
    setIsTrackingLocation(false)
  }, [removeUserLocationMarker])

  const updateUserLocationMarker = useCallback((latitude, longitude, shouldCenter = false) => {
    if (!map.current) return

    if (!userLocationMarkerRef.current) {
      const dark = isDarkMode()
      const el = document.createElement('div')
      el.style.cssText = `
        width: 16px;
        height: 16px;
        background: #f97316;
        border: 2px solid ${dark ? '#121212' : 'white'};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `
      userLocationMarkerRef.current = new maptilersdk.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map.current)
    } else {
      userLocationMarkerRef.current.setLngLat([longitude, latitude])
    }

    if (shouldCenter) {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 16,
        duration: 700,
      })
    }
  }, [])

  const toggleLocationTracking = () => {
    if (!map.current || !navigator.geolocation) {
      alert('현재 위치 기능을 사용할 수 없어요.')
      return
    }

    if (isTrackingLocation) {
      stopLocationTracking()
      return
    }

    const handlePosition = (position, shouldCenter = false) => {
      const { latitude, longitude } = position.coords
      updateUserLocationMarker(latitude, longitude, shouldCenter)
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePosition(position, true)
        const watchId = navigator.geolocation.watchPosition(
          (nextPosition) => handlePosition(nextPosition, false),
          () => {
            stopLocationTracking()
            alert('위치를 가져올 수 없어요. 위치 권한을 허용해주세요.')
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
        )
        locationWatchIdRef.current = watchId
        setIsTrackingLocation(true)
      },
      () => {
        alert('위치를 가져올 수 없어요. 위치 권한을 허용해주세요.')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )
  }

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current)
      }
      removeUserLocationMarker()
    }
  }, [removeUserLocationMarker])

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
        onClick={toggleLocationTracking}
        aria-pressed={isTrackingLocation}
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '16px',
          zIndex: 1000,
          background: isTrackingLocation ? '#f97316' : darkMapControls ? '#121212' : 'white',
          border: isTrackingLocation
            ? '1px solid #f97316'
            : darkMapControls
              ? '1px solid #2c2c2e'
              : 'none',
          borderRadius: '12px',
          width: '44px',
          height: '44px',
          padding: 0,
          boxShadow: isTrackingLocation
            ? '0 3px 12px rgba(249,115,22,0.35)'
            : darkMapControls
              ? '0 2px 10px rgba(0,0,0,0.55)'
              : '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={isTrackingLocation ? '현재 위치 끄기' : '현재 위치 켜기'}
      >
        <MapPinSimple
          size={22}
          weight={isTrackingLocation ? 'fill' : 'bold'}
          color={isTrackingLocation ? (darkMapControls ? '#121212' : 'white') : '#f97316'}
        />
      </button>
    </div>
  )
}
