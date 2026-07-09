import { useEffect } from 'react'

export function useAppViewportHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const root = document.documentElement
    const previousHeight = root.style.getPropertyValue('--app-viewport-height')

    const syncViewportHeight = () => {
      const height = Math.max(
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0,
        window.visualViewport?.height || 0,
      )
      root.style.setProperty('--app-viewport-height', `${height}px`)
    }

    syncViewportHeight()
    window.addEventListener('resize', syncViewportHeight)
    window.addEventListener('orientationchange', syncViewportHeight)
    window.visualViewport?.addEventListener('resize', syncViewportHeight)

    return () => {
      window.removeEventListener('resize', syncViewportHeight)
      window.removeEventListener('orientationchange', syncViewportHeight)
      window.visualViewport?.removeEventListener('resize', syncViewportHeight)

      if (previousHeight) {
        root.style.setProperty('--app-viewport-height', previousHeight)
      } else {
        root.style.removeProperty('--app-viewport-height')
      }
    }
  }, [])
}
