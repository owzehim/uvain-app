import { useState, useEffect } from 'react'
import { generateTOTP, getSecondsLeft } from '../lib/totp'

export function useQRToken(secret) {
  const [token, setToken] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(15)

  useEffect(() => {
    if (!secret) return

    const refresh = async () => {
      const newToken = await generateTOTP(secret)
      setToken(newToken)
    }

    const updateTimer = () => {
      setSecondsLeft(getSecondsLeft())
    }

    refresh()
    updateTimer()

    const interval = setInterval(() => {
      refresh()
      updateTimer()
    }, 1000)

    return () => clearInterval(interval)
  }, [secret])

  return { token, secondsLeft }
}