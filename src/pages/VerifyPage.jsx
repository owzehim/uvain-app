import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { verifyTOTP } from '../lib/totp'

export default function VerifyPage() {
  const { token } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const pollIntervalRef = useRef(null)

  // Function to verify the QR code
  const verifyQRCode = async (qrToken) => {
    const parts = qrToken?.split('_')
    if (!parts || parts.length < 2) {
      setResult({ valid: false, reason: 'Invalid QR code.' })
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
      return
    }

    const isValidToken = await verifyTOTP(otpToken, member.totp_secret)
    const isActiveMember = member.is_member && member.membership_valid_until && new Date(member.membership_valid_until) >= new Date()

    if (!isValidToken) {
      setResult({ valid: false, reason: 'QR code has expired. Please ask the member to refresh.' })
    } else if (!isActiveMember) {
      setResult({ valid: false, reason: 'Membership is not active.', member })
    } else {
      setResult({ valid: true, member })
    }
  }

  // Initial verification
  useEffect(() => {
    const initialVerify = async () => {
      await verifyQRCode(token)
      setLoading(false)
    }

    initialVerify()
  }, [token])

  // Poll for QR code changes every 2 seconds
  useEffect(() => {
    if (loading || !token) return

    pollIntervalRef.current = setInterval(async () => {
      await verifyQRCode(token)
    }, 2000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [token, loading])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Verifying...</p>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-bold text-gray-900 text-lg">UvA-IN Membership</h1>
          <p className="text-xs text-gray-400 mt-1">University of Amsterdam Korean Student Association</p>
        </div>

        {result?.valid ? (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-green-600 font-bold text-2xl">✓ Valid</p>
              <p className="text-green-500 text-sm mt-1">Membership is active</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Name</span>
                <span className="font-medium">{result.member.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Student No.</span>
                <span className="font-medium">{result.member.student_number}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Major</span>
                <span className="font-medium">{result.member.major}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Valid Until</span>
                <span className="font-medium text-green-600">{result.member.membership_valid_until}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-red-600 font-bold text-2xl">✗ Invalid</p>
              <p className="text-red-400 text-sm mt-1">{result?.reason}</p>
            </div>

            {result?.member && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Name</span>
                  <span className="font-medium">{result.member.full_name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Valid Until</span>
                  <span className="font-medium text-red-500">{result.member.membership_valid_until}</span>
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