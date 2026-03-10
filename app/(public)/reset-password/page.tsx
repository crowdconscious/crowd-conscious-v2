'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClientAuth } from '../../../lib/auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientAuth()

  useEffect(() => {
    // Establish session from URL tokens before allowing password update.
    // Supabase can send: (a) access_token + refresh_token in hash/query, or (b) code (PKCE) in query.
    // We must explicitly set the session — otherwise updateUser() fails with "Auth session missing!"
    const establishSession = async () => {
      const hashParams = new URLSearchParams(window.location.hash?.substring(1) || '')
      const accessToken =
        hashParams.get('access_token') || searchParams.get('access_token')
      const refreshToken =
        hashParams.get('refresh_token') || searchParams.get('refresh_token')
      const type = hashParams.get('type') || searchParams.get('type')
      const code = searchParams.get('code')

      // Already have a session (e.g. from prior page load)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidToken(true)
        return
      }

      // PKCE flow: exchange code for session (requires same browser that requested reset)
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Code exchange failed:', error)
          setIsValidToken(false)
          setMessage(
            error.message?.includes('code verifier')
              ? 'Please request a new password reset on this device and click the link in the same browser. Links opened on a different device won\'t work.'
              : 'Invalid or expired reset link. Please request a new password reset.'
          )
          return
        }
        if (data.session) {
          setIsValidToken(true)
          return
        }
      }

      // Implicit flow: set session from access_token + refresh_token
      if (accessToken && refreshToken && type === 'recovery') {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          console.error('Set session failed:', error)
          setIsValidToken(false)
          setMessage('Invalid or expired reset link. Please request a new password reset.')
          return
        }
        if (data.session) {
          setIsValidToken(true)
          return
        }
      }

      setIsValidToken(false)
      setMessage('Invalid or expired reset link. Please request a new password reset.')
    }

    establishSession()
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // Ensure we have a session before updateUser (can be lost on mobile/in-app browsers)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage('Your session expired. Please click the reset link in your email again and try immediately.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error('❌ Password update error:', error)
        setMessage(error.message)
        setSuccess(false)
      } else {
        setSuccess(true)
        setMessage('Your password has been successfully reset!')
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login?password_reset=success')
        }, 2000)
      }
    } catch (error: any) {
      console.error('💥 Unexpected error during password reset:', error)
      setMessage(`An unexpected error occurred: ${error?.message || 'Unknown error'}`)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Invalid Reset Link</h1>
            <p className="text-slate-600 mt-2">
              This password reset link is invalid or has expired.
            </p>
          </div>

          {message && (
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200 mb-6">
              {message}
            </div>
          )}

          <div className="space-y-4">
            <Link
              href="/forgot-password"
              className="block w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
            >
              Request New Reset Link
            </Link>

            <div className="text-center">
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium text-sm">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
          <p className="text-slate-600 mt-2">
            Enter your new password below
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold">{message}</p>
                  <p className="text-sm mt-1">Redirecting to login...</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('successfully') 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium text-sm">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

