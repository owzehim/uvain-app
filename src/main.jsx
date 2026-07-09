import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

const APP_BUILD_ID = __APP_BUILD_ID__
const APP_BUILD_STORAGE_KEY = 'uvain_app_build_id'

let refreshing = false

if (typeof window !== 'undefined') {
  window.__UVAIN_BUILD_ID__ = APP_BUILD_ID

  const previousBuildId = window.localStorage.getItem(APP_BUILD_STORAGE_KEY)
  if (previousBuildId !== APP_BUILD_ID) {
    window.localStorage.setItem(APP_BUILD_STORAGE_KEY, APP_BUILD_ID)

    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames
          .filter((cacheName) =>
            cacheName.includes('workbox') ||
            cacheName.includes('precache') ||
            cacheName.includes('uvain'),
          )
          .forEach((cacheName) => caches.delete(cacheName))
      })
    }
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true)
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      if (registration.waiting) {
        updateSW(true)
      }

      registration.update()

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            updateSW(true)
          }
        })
      })

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update()
        }
      })

      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error)
    },
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
