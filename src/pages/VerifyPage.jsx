import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { verifyTOTP } from '../lib/totp'

export default function VerifyPage() {
  const { token } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verify = async () => {
      const parts = token?.split('_')
      if (!parts || parts.length < 2) {
        setResult({ valid: false, reason: '잘못된 QR 코드입니다.' })
        setLoading(false)
        return
      }

      const otpToken = parts[0]
      const studentNumber = parts[1]

      const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('student_number', studentNumber)
        .single()

      if (!member) {
        setResult({ valid: false, reason: '등록되지 않은 멤버입니다.' })
        setLoading(false)
        return
      }

        const isValidToken = await verifyTOTP(otpToken, member.totp_secret)

      const isActiveMember = member.is_member &&
        member.membership_valid_until &&
        new Date(member.membership_valid_until) >= new Date()

      if (!isValidToken) {
        setResult({ valid: false, reason: '만료된 QR 코드입니다. 다시 스캔해주세요.' })
      } else if (!isActiveMember) {
        setResult({ valid: false, reason: '멤버십이 만료되었습니다.', member })
      } else {
        setResult({ valid: true, member })
      }

      setLoading(false)
    }

    verify()
  }, [token])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">확인 중...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 w-full max-w-sm">

        <div className="text-center mb-6">
          <h1 className="font-bold text-gray-900 text-lg">UvA-IN 멤버십 확인</h1>
        </div>

        {result?.valid ? (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-green-600 font-bold text-xl">✓ 유효한 멤버십</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">이름</span>
                <span className="font-medium">{result.member.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">학번</span>
                <span className="font-medium">{result.member.student_number}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">전공</span>
                <span className="font-medium">{result.member.major}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">유효기간</span>
                <span className="font-medium text-green-600">{result.member.membership_valid_until}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-red-600 font-bold text-xl">✗ 확인 실패</p>
              <p className="text-red-500 text-sm mt-1">{result?.reason}</p>
            </div>
            {result?.member && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">이름</span>
                  <span className="font-medium">{result.member.full_name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">유효기간</span>
                  <span className="font-medium text-red-500">{result.member.membership_valid_until}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}