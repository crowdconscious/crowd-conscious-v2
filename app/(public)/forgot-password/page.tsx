'use client'

import { useState } from 'react'
import { createClientAuth } from '../../../lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const supabase = createClientAuth()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        console.error('❌ Password reset error:', error)
        setMessage(error.message)
        setSuccess(false)
      } else {
        setSuccess(true)
        setMessage('Check your email for a password reset link. The link will expire in 1 hour.')
      }
    } catch (error: any) {
      console.error('💥 Unexpected error during password reset:', error)
      setMessage(`An unexpected error occurred: ${error?.message || 'Unknown error'}`)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-slate-600 mt-2">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm">{message}</p>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <p className="text-slate-600 text-sm">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => {
                  setSuccess(false)
                  setEmail('')
                  setMessage('')
                }}
                className="text-teal-600 hover:text-teal-700 font-medium text-sm"
              >
                Send another email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            {message && !success && (
              <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium text-sm">
            ← Back to Sign In
          </Link>
        </div>

        <div className="mt-4 text-center">
          <p className="text-slate-600 text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

