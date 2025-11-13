'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClientAuth } from '../../../lib/auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientAuth()

  useEffect(() => {
    const error = searchParams.get('error')
    const passwordReset = searchParams.get('password_reset')
    
    if (error === 'auth_callback_error') {
      setMessage('There was an error confirming your email. Please try signing in.')
    } else if (error === 'auth_callback_exception') {
      setMessage('Authentication error. Please try again.')
    } else if (passwordReset === 'success') {
      setMessage('Password reset successful! Please sign in with your new password.')
    }
  }, [searchParams])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      console.log('🔐 Starting sign in process...')
      console.log('📧 Email:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('📦 Sign in response:', { 
        hasUser: !!data.user, 
        hasError: !!error,
        errorMessage: error?.message 
      })

      if (error) {
        console.error('❌ Sign in error:', error)
        setMessage(error.message)
      } else if (data.user) {
        console.log('✅ Sign in successful, user:', data.user.id)
        console.log('✅ Session established:', !!data.session)
        console.log('🔄 Redirecting to dashboard...')
        
        // Use window.location for hard navigation to ensure session is properly set
        // This forces a server round-trip which ensures getCurrentUser() sees the session
        window.location.href = '/dashboard'
      }
    } catch (error: any) {
      console.error('💥 Unexpected error during sign in:', error)
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        type: typeof error
      })
      setMessage(`An unexpected error occurred: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-600 mt-2">Sign in to your Crowd Conscious account</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <Link 
                href="/forgot-password" 
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('successful') 
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
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-medium">
              Sign Up
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-slate-500 hover:text-slate-700 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
