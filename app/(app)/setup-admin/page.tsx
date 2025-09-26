'use client'

import { useState } from 'react'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'

export default function SetupAdminPage() {
  const [secretKey, setSecretKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secretKey }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        setMessage(result.message)
      } else {
        setIsSuccess(false)
        setMessage(result.error || 'Failed to setup admin')
      }
    } catch (error) {
      setIsSuccess(false)
      setMessage('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <AnimatedCard className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup Admin Account</h1>
          <p className="text-slate-600 text-sm">
            One-time setup to create your admin account
          </p>
        </div>

        <form onSubmit={handleSetupAdmin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Secret Key
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter secret key"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Use: <code className="bg-slate-100 px-1 rounded">setup-admin-2024</code>
            </p>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              isSuccess 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <AnimatedButton
            type="submit"
            disabled={isLoading || !secretKey}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Setting up...
              </span>
            ) : (
              'Setup Admin Account'
            )}
          </AnimatedButton>
        </form>

        {isSuccess && (
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 mb-3">
              Admin account created! Refresh the page to see admin controls.
            </p>
            <AnimatedButton
              onClick={() => window.location.href = '/admin'}
              variant="ghost"
              size="sm"
            >
              Go to Admin Dashboard
            </AnimatedButton>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            This page should be removed after setup is complete
          </p>
        </div>
      </AnimatedCard>
    </div>
  )
}
