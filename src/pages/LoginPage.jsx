import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('로그인 시도:', email, password)
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('Supabase Key 앞 20자:', import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20))

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('결과 data:', data)
    console.log('결과 error:', error)

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => window.location.href = '/public'}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='100' fill='%23FF6B35'/%3E%3Ccircle cx='100' cy='100' r='85' fill='%23E74C3C'/%3E%3Ccircle cx='50' cy='100' r='85' fill='%230052CC'/%3E%3Cpath d='M 70 70 L 130 130 M 130 70 L 70 130' stroke='white' stroke-width='12' stroke-linecap='round'/%3E%3Cpath d='M 100 50 L 150 100 L 100 150 L 50 100 Z' stroke='white' stroke-width='12' stroke-linecap='round' fill='none'/%3E%3C/svg%3E"
            alt="UvA-IN Logo"
            className="w-24 h-24"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">UvA-IN</h1>
          <p className="text-gray-500 text-sm mt-1">University of Amsterdam 한국인 학생회</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="student@student.uva.nl"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}