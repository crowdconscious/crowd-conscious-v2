'use client'

import { useState } from 'react'
import { createClientAuth } from '../../../lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const supabase = createClientAuth()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      console.log('🚀 Starting signup process...')
      console.log('📧 Email:', email)
      console.log('👤 Full name:', fullName)
      console.log('🔗 Redirect URL:', `${window.location.origin}/auth/callback`)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      console.log('📦 Signup response:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        hasError: !!error,
        errorMessage: error?.message
      })

      if (error) {
        console.error('❌ Signup error:', error)
        // Better error messages for common issues
        if (error.message.includes('already registered')) {
          setMessage('This email is already registered. Please sign in instead.')
        } else if (error.message.includes('duplicate')) {
          setMessage('An account with this email already exists. Please sign in.')
        } else {
          setMessage(error.message)
        }
      } else if (data.user) {
        console.log('✅ User created in auth.users:', data.user.id)
        
        // Check if profile was created by trigger
        console.log('🔍 Checking if profile exists...')
        const { data: existingProfile, error: checkError } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        console.log('Profile check result:', { existingProfile, checkError })
        
        if (!existingProfile) {
          console.log('⚠️ Profile not found - creating manually...')
          // Try to create profile manually if trigger didn't work
          try {
            const { data: newProfile, error: profileError } = await (supabase as any)
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email,
                full_name: fullName,
                user_type: 'user'
              })
              .select()
              .single()
            
            if (profileError) {
              console.error('❌ Profile creation error:', profileError)
              // If it's a duplicate error, it's actually OK - the trigger already created it
              if (!profileError.message?.includes('duplicate')) {
                setMessage(`Profile creation failed: ${profileError.message}`)
                return
              }
            } else {
              console.log('✅ Profile created manually:', newProfile)
            }
          } catch (profileErr: any) {
            console.error('❌ Profile creation exception:', profileErr)
            // Check if it's a duplicate error - that's actually fine
            if (!profileErr?.message?.includes('duplicate')) {
              setMessage(`Error: ${profileErr.message}`)
              return
            }
          }
        } else {
          console.log('✅ Profile already exists (trigger worked!):', existingProfile)
        }
        
        setMessage('✅ Account created! Check your email for the confirmation link.')
        
        // Try to send welcome email
        try {
          await fetch('/api/emails/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.user.email,
              name: fullName
            })
          })
        } catch (emailErr) {
          console.log('Welcome email failed:', emailErr)
          // Don't show error to user - account creation succeeded
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      
      if (error?.message?.includes('duplicate') || error?.message?.includes('already exists')) {
        setMessage('This email is already registered. Please sign in or use a different email.')
      } else {
        // Show the actual error in development
        const errorMsg = error?.message || error?.toString() || 'Unknown error'
        setMessage(`Error: ${errorMsg}. Check console for details.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Join Crowd Conscious</h1>
          <p className="text-slate-600 mt-2">Create your account to start making impact</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Create a password (min 6 characters)"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('Check your email') 
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Sign In
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
