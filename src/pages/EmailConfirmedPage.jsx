// src/pages/EmailConfirmedPage.jsx
//
// Landing page for Supabase email confirmation links.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, SpinnerGap } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'

export default function EmailConfirmedPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    const verifyEmail = async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

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
          const verifiedEmail = session.user?.email?.trim().toLowerCase()
          if (verifiedEmail && typeof window !== 'undefined') {
            window.localStorage.setItem('uvain_skip_otp_once_email', verifiedEmail)
          }
          await supabase.auth.signOut()
          if (!cancelled) setStatus('success')
          return
        }

        setErrorMsg('This link has already been used or has expired.')
        setStatus('error')
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message || 'Something went wrong.')
          setStatus('error')
        }
      }
    }

    verifyEmail()

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'success') {
    return (
      <div style={styles.page}>
        <div style={styles.panel}>
          <CheckCircle size={64} weight="fill" color="#f97316" />
          <h1 style={styles.title}>이메일 인증이 완료되었습니다</h1>
          <p style={styles.message}>
            이제 UvA-IN 앱으로 돌아가 로그인해 주세요.
          </p>
        </div>
      </div>
    )
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
            <h1 style={styles.title}>이메일 인증이 실패하였습니다</h1>
            <p style={styles.message}>
              {errorMsg || '확인 링크를 처리할 수 없습니다.'}
            </p>
            <p style={styles.note}>
              링크가 만료되었거나 이미 사용되었을 수 있습니다. 앱에서 새 확인 이메일을 요청해주세요.
            </p>
            <button type="button" onClick={() => navigate('/login')} style={styles.primaryButton}>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    fontFamily: 'var(--font-app)',
    padding: '24px 16px',
    boxSizing: 'border-box',
  },
  panel: {
    width: '100%',
    maxWidth: '360px',
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
  primaryButton: {
    width: '100%',
    marginTop: '8px',
    border: 'none',
    borderRadius: '9999px',
    padding: '13px 16px',
    background: '#f97316',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  spinnerIcon: {
    animation: 'spin 0.8s linear infinite',
  },
}
