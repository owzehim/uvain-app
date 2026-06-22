import { useNavigate } from 'react-router-dom'
import { CaretLeft, X } from '@phosphor-icons/react'
import { useLogin } from '../hooks/useLogin'

export default function LoginPage() {
  const navigate = useNavigate()
  const {
    step,
    email,
    setEmail,
    password,
    setPassword,
    otp,
    setOtp,
    loading,
    error,
    resendSuccess,
    handleCredentialsSubmit,
    handleOtpSubmit,
    handleResendOtp,
    handleResendConfirmation,
    handleBack,
  } = useLogin()

  const isOtpStep = step === 'otp'

  return (
    <div className="fixed inset-0 flex items-start justify-center overflow-hidden bg-white px-4 pt-[16vh]">
      {isOtpStep ? (
        <button
          type="button"
          onClick={handleBack}
          className="fixed left-5 top-[calc(env(safe-area-inset-top)+18px)] z-10 text-gray-700 transition-colors hover:text-gray-900"
          aria-label="Back to login"
        >
          <CaretLeft size={30} weight="regular" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/public')}
          className="fixed right-5 top-[calc(env(safe-area-inset-top)+18px)] z-10 text-gray-400 transition-colors hover:text-gray-600"
          aria-label="Close login"
        >
          <X size={22} weight="bold" />
        </button>
      )}

      <div className="w-full max-w-sm px-2">
        {!isOtpStep && (
          <>
            <div className="mb-3 flex justify-center">
              <img src="/uvain logo.png" alt="UvA-IN Logo" className="h-24 w-24" />
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold text-gray-900">UvA-IN</h1>
              <p className="mt-1 text-sm text-gray-500">
                네덜란드 유학생을 위한 공식 커뮤니티
              </p>
            </div>
          </>
        )}

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

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-full bg-orange-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? '확인 중...' : '로그인'}
            </button>

            <p className="pt-2 text-center text-xs text-gray-400">
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-orange-500 hover:underline"
              >
                회원가입
              </button>
            </p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="mb-8 min-h-[176px] pt-[54px] text-left">
              <h2 className="text-2xl font-semibold text-gray-900">이메일 인증 코드</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                <span className="font-medium text-gray-900">{email}</span>로<br />
                6자리 인증 코드를 보냈습니다.
              </p>
            </div>

            <LoginField label="인증 코드">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} text-center font-mono text-base tracking-[0.35em]`}
                placeholder=""
                autoFocus
                required
              />
            </LoginField>

            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            {resendSuccess && (
              <p className="text-center text-sm text-green-600">
                인증 코드를 다시 보냈습니다.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-full bg-orange-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? '확인 중...' : '인증하고 로그인'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full pt-1 text-center text-xs font-medium text-orange-500 hover:underline disabled:opacity-50"
            >
              코드 다시 보내기
            </button>
          </form>
        )}

        {step === 'unconfirmed' && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-semibold text-gray-900">이메일 확인이 필요합니다</h2>
            <p className="text-sm leading-relaxed text-gray-500">
              <span className="font-medium text-gray-900">{email}</span>로 보낸<br />
              인증 링크를 열고 다시 로그인해주세요.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {resendSuccess && (
              <p className="text-sm text-green-600">인증 이메일을 다시 보냈습니다.</p>
            )}

            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={loading}
              className="w-full rounded-full bg-orange-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? '전송 중...' : '인증 이메일 다시 보내기'}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="w-full pt-1 text-xs text-gray-400 hover:text-gray-600"
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
