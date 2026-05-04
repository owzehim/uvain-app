import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { verifyTOTP } from '../lib/totp'

export default function VerifyPage() {
  const { token } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(null)

  useEffect(() => {
    const verify = async () => {
      const parts = token?.split('_')
      if (!parts || parts.length < 2) {
        setResult({ valid: false, reason: 'Invalid QR code.' })
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
        setResult({ valid: false, reason: 'Member not found.' })
        setLoading(false)
        return
      }

      const isValidToken = await verifyTOTP(otpToken, member.totp_secret)

      const isActiveMember = member.is_member &&
        member.membership_valid_until &&
        new Date(member.membership_valid_until) >= new Date()

      if (!isValidToken) {
        setResult({ valid: false, reason: 'QR code has expired. Please ask the member to refresh.' })
      } else if (!isActiveMember) {
        setResult({ valid: false, reason: 'Membership is not active.', member })
      } else {
        setResult({ valid: true, member })
        // Calculate seconds left in current 15s TOTP window
        const remaining = 15 - (Math.floor(Date.now() / 1000) % 15)
        setSecondsLeft(remaining)
      }

      setLoading(false)
    }

    verify()
  }, [token])

  // Countdown timer — expire the validation when window ends
  useEffect(() => {
    if (secondsLeft === null || !result?.valid) return
    if (secondsLeft <= 0) { setExpired(true); return }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, result])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Verifying...</p>
    </div>
  )

  const showResult = expired ? { valid: false, reason: 'QR code has expired.', member: result?.member } : result

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 w-full max-w-sm">

        <div className="text-center mb-6">
          <h1 className="font-bold text-gray-900 text-lg">UvA-IN Membership</h1>
          <p className="text-xs text-gray-400 mt-1">University of Amsterdam Korean Student Association</p>
        </div>

        {showResult?.valid ? (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-green-600 font-bold text-2xl">✓ Valid</p>
              <p className="text-green-500 text-sm mt-1">Membership is active</p>
              {secondsLeft !== null && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Expires in</span>
                    <span>{secondsLeft}s</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: (secondsLeft / 15 * 100) + '%' }} />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Name</span>
                <span className="font-medium">{showResult.member.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Student No.</span>
                <span className="font-medium">{showResult.member.student_number}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Major</span>
                <span className="font-medium">{showResult.member.major}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Valid Until</span>
                <span className="font-medium text-green-600">{showResult.member.membership_valid_until}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-red-600 font-bold text-2xl">✗ Invalid</p>
              <p className="text-red-400 text-sm mt-1">{showResult?.reason}</p>
            </div>
            {showResult?.member && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Name</span>
                  <span className="font-medium">{showResult.member.full_name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Valid Until</span>
                  <span className="font-medium text-red-500">{showResult.member.membership_valid_until}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-300 text-center mt-6">UvA-IN © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}