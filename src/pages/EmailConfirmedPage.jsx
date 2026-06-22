// src/pages/EmailConfirmedPage.jsx
//
// Landing page for Supabase email confirmation links.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, SpinnerGap } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { resendConfirmationEmail } from '../api/authRepository'

export default function EmailConfirmedPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    const verifyEmail = async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const emailFromUrl = url.searchParams.get('email')
        if (emailFromUrl) setEmail(emailFromUrl)

        let session = null
        let error = null

        if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code)
          session = result.data?.session
          error = result.error
        } else {
          const result = await supabase.auth.getSession()
          session = result.data?.session
          error = result.error
        }

        if (cancelled) return

        if (error) {
          setErrorMsg(error.message)
          setStatus('error')
          return
        }

        if (session) {
          await supabase.auth.signOut()
          if (!cancelled) setStatus('success')
          return
        }

        setErrorMsg('링크가 이미 사용되었거나 만료되었습니다.')
        setStatus('error')
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message || '확인 링크를 처리할 수 없습니다.')
          setStatus('error')
        }
      }
    }

    verifyEmail()

    return () => {
      cancelled = true
    }
  }, [])

  const handleResend = async (event) => {
    event.preventDefault()
    setResendMessage('')

    if (!email.trim() || !email.includes('@')) {
      setResendMessage('이메일 주소를 입력해주세요.')
      return
    }

    setResending(true)
    try {
      await resendConfirmationEmail(email.trim())
      setResendMessage('새 이메일 인증 링크를 보냈습니다. 받은 편지함을 확인해주세요.')
    } catch (err) {
      setResendMessage(err.message || '인증 이메일을 다시 보내지 못했습니다.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        {status === 'verifying' && (
          <>
            <SpinnerGap size={54} weight="bold" color="#f97316" style={styles.spinnerIcon} />
            <h1 style={styles.title}>이메일 확인 중</h1>
            <p style={styles.message}>잠시만 기다려주세요.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} weight="fill" color="#f97316" />
            <h1 style={styles.title}>이메일 확인 완료</h1>
            <p style={styles.message}>
              이메일 주소가 확인되었습니다.<br />
              이제 UvA-IN 앱으로 돌아가 로그인해주세요.
            </p>
            <button type="button" onClick={() => navigate('/login')} style={styles.primaryButton}>
              로그인으로 이동
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} weight="fill" color="#ef4444" />
            <h1 style={styles.title}>이메일 확인 실패</h1>
            <p style={styles.message}>{errorMsg || '확인 링크를 처리할 수 없습니다.'}</p>
            <p style={styles.note}>
              테스트 중 같은 링크를 여러 번 열었거나 링크가 만료되면 실패할 수 있습니다.
              아래에서 새 이메일 인증 링크를 다시 받을 수 있어요.
            </p>

            <form onSubmit={handleResend} style={styles.resendForm}>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>이메일</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  style={styles.input}
                  placeholder=""
                />
              </label>
              <button
                type="submit"
                disabled={resending}
                style={{
                  ...styles.primaryButton,
                  opacity: resending ? 0.65 : 1,
                  cursor: resending ? 'not-allowed' : 'pointer',
                }}
              >
                {resending ? '보내는 중...' : '이메일 인증 다시 보내기'}
              </button>
            </form>

            {resendMessage && <p style={styles.resendMessage}>{resendMessage}</p>}

            <button type="button" onClick={() => navigate('/login')} style={styles.secondaryButton}>
              로그인으로 이동
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    fontFamily: '"Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 'calc(env(safe-area-inset-top) + 118px) 16px 24px',
    boxSizing: 'border-box',
  },
  panel: {
    width: '100%',
    maxWidth: '336px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '14px',
  },
  title: {
    margin: '8px 0 0',
    fontSize: '24px',
    lineHeight: 1.25,
    fontWeight: 700,
    color: '#111827',
  },
  message: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.65,
    color: '#6b7280',
  },
  note: {
    margin: '2px 0 4px',
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    fontSize: '13px',
    lineHeight: 1.55,
    color: '#6b7280',
  },
  resendForm: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '2px',
  },
  field: {
    display: 'flex',
    height: '54px',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '5px',
    border: '1px solid #d8dde5',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    padding: '8px 12px 7px',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: 1,
    color: '#6b7280',
  },
  input: {
    width: '100%',
    minHeight: '20px',
    border: 'none',
    outline: 'none',
    padding: 0,
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: '13px',
    boxSizing: 'border-box',
  },
  primaryButton: {
    width: '100%',
    border: 'none',
    borderRadius: '9999px',
    padding: '13px 16px',
    background: '#f97316',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: 'none',
    background: 'transparent',
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px',
    cursor: 'pointer',
  },
  resendMessage: {
    margin: 0,
    fontSize: '12px',
    lineHeight: 1.45,
    color: '#6b7280',
  },
  spinnerIcon: {
    animation: 'spin 0.8s linear infinite',
  },
}
