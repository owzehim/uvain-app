import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import MemberPage from './pages/MemberPage'
import AdminPage from './pages/AdminPage'
import VerifyPage from './pages/VerifyPage'
import PublicPage from './pages/PublicPage'
import ScanPage from './pages/ScanPage'
import InstallBanner from './components/InstallBanner'
import RegistrationPage from './pages/RegistrationPage'
import EmailConfirmedPage from './pages/EmailConfirmedPage'
import SettingsPage from './pages/SettingsPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { useSingleDeviceSession } from './hooks/useSingleDeviceSession'
import { useTheme } from './hooks/useTheme'

const OTP_PENDING_KEY = 'uvain_otp_pending_email'
const OTP_PENDING_EVENT = 'uvain-otp-pending-change'

function isStandaloneApp() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function App() {
  useTheme()
  const [session, setSession] = useState(undefined)
  const [isOtpPending, setIsOtpPending] = useState(() =>
    typeof window !== 'undefined' &&
    Boolean(window.sessionStorage.getItem(OTP_PENDING_KEY))
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const updateOtpPending = () => {
      setIsOtpPending(Boolean(window.sessionStorage.getItem(OTP_PENDING_KEY)))
    }

    window.addEventListener(OTP_PENDING_EVENT, updateOtpPending)
    window.addEventListener('storage', updateOtpPending)

    return () => {
      window.removeEventListener(OTP_PENDING_EVENT, updateOtpPending)
      window.removeEventListener('storage', updateOtpPending)
    }
  }, [])

  useSingleDeviceSession(isOtpPending ? null : session)

  useEffect(() => {
    if (!isStandaloneApp()) return undefined

    const preventPinch = (e) => {
      if (e.touches?.length > 1) e.preventDefault()
    }
    const preventGesture = (e) => e.preventDefault()

    document.addEventListener('touchmove', preventPinch, { passive: false })
    document.addEventListener('gesturestart', preventGesture)
    document.addEventListener('gesturechange', preventGesture)

    return () => {
      document.removeEventListener('touchmove', preventPinch)
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
    }
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#121212]">
        <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
      </div>
    )
  }

  const user = session?.user

  // More robust admin detection:
  const isAdmin =
    user?.user_metadata?.role === 'admin' ||
    user?.email === 'admin@uvain.nl' // fallback, just in case
  const isEmailConfirmationLink =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).has('code') ||
      window.location.hash.includes('access_token'))

  return (
    <BrowserRouter>
      <InstallBanner />
      <Routes>
        <Route
          path="/login"
          element={!session || isOtpPending ? <LoginPage /> : <Navigate to="/member" />}
        />

        <Route
          path="/member"
          element={session && !isOtpPending ? <MemberPage /> : <Navigate to={isOtpPending ? '/login' : '/public'} />}
        />
        <Route
  path="/settings"
  element={session && !isOtpPending ? <SettingsPage /> : <Navigate to="/login" />}
/>

        <Route
          path="/admin"
          element={
            isAdmin && !isOtpPending
              ? <AdminPage />
              : <Navigate to={session ? '/member' : '/login'} />
          }
        />

        <Route
          path="/scan"
          element={session && !isOtpPending ? <ScanPage /> : <Navigate to="/login" />}
        />

        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/public" element={<PublicPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/email-confirmed" element={<EmailConfirmedPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/"
          element={
            isEmailConfirmationLink
              ? <EmailConfirmedPage />
              : <Navigate to={session && !isOtpPending ? '/member' : '/public'} />
          }
        />

        <Route
          path="*"
          element={<Navigate to={session && !isOtpPending ? '/member' : '/public'} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
