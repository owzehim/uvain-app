import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { verifyTOTP } from '../lib/totp'
import { subscribeToQRExpiry } from '../lib/qrSync'

export default function VerifyPage() {
  const { token } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const unsubscribeRef = useRef(null)

  // Parse QR token into OTP and student number
  const parseToken = (qrToken) => {
    const parts = qrToken?.split('_')
    if (!parts || parts.length < 2) return null
    return {
      otpToken: parts[0],
      studentNumber: parts[1]
    }
  }

  // Verify the QR code against the database
  const verifyQRCode = async (qrToken) => {
    const parsed = parseToken(qrToken)
    if (!parsed) {
      setResult({ valid: false, reason: 'Invalid QR code.' })
      return
    }

    const { otpToken, studentNumber } = parsed

    try {
      // Fetch member data from database
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('student_number', studentNumber)
        .single()

      if (memberError || !member) {
        setResult({ valid: false, reason: 'Member not found.' })
        return
      }

      // Verify TOTP token
      const isValidToken = await verifyTOTP(otpToken, member.totp_secret)

      // Check if membership is active
      const isActiveMember =
        member.is_member &&
        member.membership_valid_until &&
        new Date(member.membership_valid_until) >= new Date()

      // Set result based on verification
      if (!isValidToken) {
        setResult({
          valid: false,
          reason: 'QR code has expired. Please ask the member to refresh.'
        })
      } else if (!isActiveMember) {
        setResult({
          valid: false,
          reason: 'Membership is not active.',
          member
        })
      } else {
        setResult({
          valid: true,
          member
        })
      }
    } catch (error) {
      console.error('Verification error:', error)
      setResult({
        valid: false,
        reason: 'Verification error. Please try again.'
      })
    }
  }

  // Initial verification when page loads
  useEffect(() => {
    const initialVerify = async () => {
      await verifyQRCode(token)
      setLoading(false)
    }
    initialVerify()
  }, [token])

  // Subscribe to real-time QR expiry broadcasts
  useEffect(() => {
    if (loading || !token) return

    const parsed = parseToken(token)
    if (!parsed) return

    // When main app broadcasts QR expiry, re-verify immediately
    unsubscribeRef.current = subscribeToQRExpiry(
      parsed.studentNumber,
      async () => {
        console.log('QR code expired, re-verifying...')
        await verifyQRCode(token)
      }
    )

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [token, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Verifying...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-bold text-gray-900 text-lg">UvA-IN Membership</h1>
          <p className="text-xs text-gray-400 mt-1">
            University of Amsterdam Korean Student Association
          </p>
        </div>

        {/* Valid Result */}
        {result?.valid ? (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-green-600 font-bold text-2xl">✓ Valid</p>
              <p className="text-green-500 text-sm mt-1">Membership is active</p>
            </div>

            {/* Member Details */}
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
                <span className="font-medium text-green-600">
                  {result.member.membership_valid_until}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Invalid Result */
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-red-600 font-bold text-2xl">✗ Invalid</p>
              <p className="text-red-400 text-sm mt-1">{result?.reason}</p>
            </div>

            {/* Member Details (if available) */}
            {result?.member && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Name</span>
                  <span className="font-medium">{result.member.full_name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Valid Until</span>
                  <span className="font-medium text-red-500">
                    {result.member.membership_valid_until}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-300 text-center mt-6">
          UvA-IN © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}