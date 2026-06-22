import { useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'uvain_theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function getStoredTheme() {
  if (typeof window === 'undefined') return 'system'
  return window.localStorage.getItem(THEME_STORAGE_KEY) || 'system'
}

function prefersDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(DARK_QUERY).matches
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const dark = theme === 'dark' || (theme === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setThemeState] = useState(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)

    if (theme !== 'system') return undefined

    const media = window.matchMedia(DARK_QUERY)
    const handleChange = () => applyTheme('system')
    media.addEventListener('change', handleChange)

    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (nextTheme) => {
    setThemeState(nextTheme)
    if (nextTheme === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    }
    applyTheme(nextTheme)
  }

  return { theme, setTheme }
}
