import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretLeft } from '@phosphor-icons/react'
import { updatePassword } from '../api/authRepository'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(newPassword)
      setSuccess('비밀번호가 변경되었습니다.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || '비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="flex items-center px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex h-10 w-10 items-center justify-center text-gray-700 dark:text-gray-300"
          aria-label="설정으로 돌아가기"
        >
          <CaretLeft size={24} weight="bold" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-md px-6 pt-8">
        <h1 className="text-2xl font-black">비밀번호 바꾸기</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          새 비밀번호를 입력해주세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <label className="flex h-[58px] cursor-text flex-col justify-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-[#2c2c2e] dark:bg-[#121212]">
            <span className="text-xs text-gray-500 dark:text-gray-400">새 비밀번호</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full border-none bg-transparent p-0 text-sm outline-none dark:text-white"
              autoComplete="new-password"
              required
            />
          </label>
          <label className="flex h-[58px] cursor-text flex-col justify-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-[#2c2c2e] dark:bg-[#121212]">
            <span className="text-xs text-gray-500 dark:text-gray-400">새 비밀번호 확인</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full border-none bg-transparent p-0 text-sm outline-none dark:text-white"
              autoComplete="new-password"
              required
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {loading ? '변경 중...' : '변경 완료'}
          </button>
        </form>
      </main>
    </div>
  )
}
