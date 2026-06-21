import { useNavigate } from 'react-router-dom'
import { X } from '@phosphor-icons/react'
import { useLogin } from '../hooks/useLogin'

export default function LoginPage() {
  const navigate = useNavigate()
  const {
    step,
    email, setEmail,
    password, setPassword,
    otp, setOtp,
    loading,
    error,
    resendSuccess,
    handleCredentialsSubmit,
    handleOtpSubmit,
    handleResendOtp,
    handleResendConfirmation,
    handleBack,
  } = useLogin()

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-sm px-2">
        <div className="flex justify-end mb-8">
          <button
            type="button"
            onClick={() => navigate('/public')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close login"
          >
            <X size={22} weight="bold" />
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <img src="/uvain logo.png" alt="UvA-IN Logo" className="w-20 h-20" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">UvA-IN</h1>
          <p className="text-gray-500 text-sm mt-1">네덜란드 유학생을 위한 공식 커뮤니티</p>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-3">
            <LoginField label="이메일">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder=""
                required
              />
            </LoginField>

            <LoginField label="비밀번호">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder=""
                required
              />
            </LoginField>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full py-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors mt-5"
            >
              {loading ? '확인 중...' : '로그인'}
            </button>

            <p className="text-center text-xs text-gray-400 pt-2">
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-orange-500 font-medium hover:underline"
              >
                회원가입
              </button>
            </p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-3">
            <p className="text-sm text-gray-600 text-center mb-3">
              <span className="font-medium text-gray-900">{email}</span>로<br />
              6자리 인증 코드를 전송했습니다.
            </p>

            <LoginField label="인증 코드">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} text-center tracking-widest font-mono`}
                placeholder=""
                autoFocus
                required
              />
            </LoginField>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {resendSuccess && (
              <p className="text-green-600 text-sm text-center">코드를 다시 보냈습니다.</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full py-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors mt-5"
            >
              {loading ? '확인 중...' : '인증 확인'}
            </button>

            <div className="flex justify-between text-xs text-gray-400 pt-2">
              <button type="button" onClick={handleBack} className="hover:text-gray-600">
                뒤로
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-orange-500 hover:underline disabled:opacity-50"
              >
                코드 다시 보내기
              </button>
            </div>
          </form>
        )}

        {step === 'unconfirmed' && (
          <div className="space-y-4 text-center">
            <p className="text-sm font-medium text-gray-900">이메일 인증이 필요합니다.</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-medium">{email}</span>로 전송된<br />
              인증 링크를 열고 다시 로그인해주세요.
            </p>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {resendSuccess && (
              <p className="text-green-600 text-sm">인증 이메일을 다시 보냈습니다.</p>
            )}

            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={loading}
              className="w-full rounded-full py-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {loading ? '전송 중...' : '인증 이메일 다시 보내기'}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1"
            >
              뒤로
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoginField({ label, children }) {
  return (
    <label className="flex h-[54px] cursor-text flex-col justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2">
      <span className="text-xs font-normal leading-none text-gray-500">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full border-none bg-white p-0 text-sm text-gray-900 outline-none placeholder:text-transparent focus:outline-none'
