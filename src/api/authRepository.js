// src/api/authRepository.js
//
// All Supabase auth calls — no React, no UI.
// ✅ Copy as-is to React Native (Supabase JS works in RN).

import { supabase } from '../lib/supabase'

/**
 * Step 1 of login: verify email + password.
 * Returns the session if exempt from OTP, or signals that OTP is needed.
 *
 * NOTE: We call signInWithPassword first to verify credentials.
 * If the user is NOT exempt, we then trigger an OTP via signInWithOtp.
 * Supabase does not natively chain password + email OTP in one call,
 * so we use password auth to verify credentials, then sign out and
 * send an OTP — the OTP verify step completes the actual session.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ session: object|null, needsOtp: boolean, emailNotConfirmed: boolean }>}
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw new Error(error.message)
  }

  return { session: data.session, user: data.user }
}

/**
 * Sends a 6-digit OTP to the user's email for login verification.
 * Call this AFTER verifying credentials with signInWithPassword.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function sendLoginOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // never create a new account here
    },
  })

  if (error) throw new Error(error.message)
}

/**
 * Verifies the 6-digit OTP the user entered.
 * On success, Supabase sets the session automatically.
 *
 * @param {string} email
 * @param {string} otp  - the 6-digit code
 * @returns {Promise<{ session: object }>}
 */
export async function verifyLoginOtp(email, otp) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp.trim(),
    type: 'email',
  })

  if (error) throw new Error(error.message)
  return { session: data.session }
}

/**
 * Resends the email confirmation link for unconfirmed accounts.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resendConfirmationEmail(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  })

  if (error) throw new Error(error.message)
}

/**
 * Sends a password reset link to the user's email.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function sendPasswordResetEmail(email) {
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : undefined

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) throw new Error(error.message)
}

/**
 * Updates the password for the active password recovery session.
 *
 * @param {string} password
 * @returns {Promise<void>}
 */
export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

/**
 * Signs the current user out.
 *
 * @returns {Promise<void>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
