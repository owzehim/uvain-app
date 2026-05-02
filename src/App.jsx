import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import LoginPage from './pages/LoginPage'
import MemberPage from './pages/MemberPage'
import AdminPage from './pages/AdminPage'
import VerifyPage from './pages/VerifyPage'

function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/member" />} />
        <Route path="/member" element={session ? <MemberPage /> : <Navigate to="/login" />} />
        <Route path="/admin" element={session ? <AdminPage /> : <Navigate to="/login" />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="*" element={<Navigate to={session ? "/member" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App