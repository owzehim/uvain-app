import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logRedemption } from '../lib/redemption'
import QRScanner from '../components/QRScanner'

const STATE = { SCANNING: 'scanning', LOADING: 'loading', SUCCESS: 'success', ERROR: 'error' }

export default function ScanPage() {
  const [state, setState] = useState(STATE.SCANNING)
  const [storeName, setStoreName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  const handleScan = useCallback(async (rawValue) => {
    // QR encodes: https://uvain-app.vercel.app/redeem?store_id=UUID
    let storeId = null
    try {
      const url = new URL(rawValue)
      storeId = url.searchParams.get('store_id')
    } catch {
      if (rawValue.startsWith('store:')) storeId = rawValue.replace('store:', '')
    }

    if (!storeId) {
      setState(STATE.ERROR)
      setErrorMsg('유효하지 않은 QR 코드입니다. 매장 QR을 스캔해주세요.')
      return
    }

    setState(STATE.LOADING)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setState(STATE.ERROR)
        setErrorMsg('로그인이 필요합니다.')
        return
      }

      const result = await logRedemption({ userId: user.id, storeId })

      if (result.success) {
        setStoreName(result.storeName || '매장')
        setState(STATE.SUCCESS)
      } else {
        setState(STATE.ERROR)
        setErrorMsg(result.message || '할인을 적용할 수 없습니다. 다시 시도해주세요.')
      }
    } catch (err) {
      console.error(err)
      setState(STATE.ERROR)
      setErrorMsg('오류가 발생했습니다. 다시 시도해주세요.')
    }
  }, [])

  const reset = () => { setState(STATE.SCANNING); setStoreName(''); setErrorMsg('') }

  return (
    <div className="flex flex-col bg-gray-50 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header */}
      <div
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button onClick={() => navigate('/member')} className="text-gray-500 hover:text-gray-800 text-sm px-2 py-1 rounded-lg hover:bg-gray-100">
          ← 뒤로
        </button>
        <h1 className="font-bold text-gray-900">할인 QR 스캔</h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 gap-4">

        {state === STATE.SCANNING && (
          <>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              매장에 비치된 QR 코드를 스캔하면 할인이 자동으로 기록됩니다.
            </p>
            <QRScanner
              onScan={handleScan}
              onError={() => { setState(STATE.ERROR); setErrorMsg('카메라 접근이 거부되었습니다.') }}
            />
          </>
        )}

        {state === STATE.LOADING && (
          <div className="flex flex-col items-center gap-4 mt-20">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">멤버십 확인 중...</p>
          </div>
        )}

        {state === STATE.SUCCESS && (
          <div className="flex flex-col items-center gap-4 mt-10 text-center max-w-xs">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-4xl">✓</span>
            </div>
            <h2 className="font-bold text-gray-900 text-xl">할인 적용 완료!</h2>
            <p className="text-gray-500 text-sm">
              <strong>{storeName}</strong>에서의 할인이 기록되었습니다.<br />
              이 화면을 직원에게 보여주세요.
            </p>
            <button onClick={reset} className="w-full py-3 bg-orange-500 text-white font-semibold rounded-2xl text-sm hover:bg-orange-600 transition-colors">
              다시 스캔하기
            </button>
            <button onClick={() => navigate('/member')} className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-200 transition-colors">
              홈으로 돌아가기
            </button>
          </div>
        )}

        {state === STATE.ERROR && (
          <div className="flex flex-col items-center gap-4 mt-10 text-center max-w-xs">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-500 text-4xl">✕</span>
            </div>
            <h2 className="font-bold text-gray-900 text-xl">할인 적용 실패</h2>
            <p className="text-gray-500 text-sm">{errorMsg}</p>
            <button onClick={reset} className="w-full py-3 bg-orange-500 text-white font-semibold rounded-2xl text-sm hover:bg-orange-600 transition-colors">
              다시 시도하기
            </button>
            <button onClick={() => navigate('/member')} className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-2xl text-sm hover:bg-gray-200 transition-colors">
              홈으로 돌아가기
            </button>
          </div>
        )}

      </div>
    </div>
  )
}