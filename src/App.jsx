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
import { useSingleDeviceSession } from './hooks/useSingleDeviceSession'

function App() {
  const [session, setSession] = useState(undefined)

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

  useSingleDeviceSession(session)

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
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
          element={!session ? <LoginPage /> : <Navigate to="/member" />}
        />

        <Route
          path="/member"
          element={session ? <MemberPage /> : <Navigate to="/public" />}
        />
        <Route
  path="/settings"
  element={session ? <SettingsPage /> : <Navigate to="/login" />}
/>

        <Route
          path="/admin"
          element={
            isAdmin
              ? <AdminPage />
              : <Navigate to={session ? '/member' : '/login'} />
          }
        />

        <Route
          path="/scan"
          element={session ? <ScanPage /> : <Navigate to="/login" />}
        />

        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/public" element={<PublicPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/email-confirmed" element={<EmailConfirmedPage />} />
        <Route
          path="/"
          element={
            isEmailConfirmationLink
              ? <EmailConfirmedPage />
              : <Navigate to={session ? '/member' : '/public'} />
          }
        />

        <Route
          path="*"
          element={<Navigate to={session ? '/member' : '/public'} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
