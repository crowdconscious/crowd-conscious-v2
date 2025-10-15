'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AnimatedCard } from '@/components/ui/UIComponents'

interface PaymentsDashboardProps {
  user: any
}

interface OnboardingStatus {
  onboarded: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  account_id?: string
}

export default function PaymentsDashboard({ user }: PaymentsDashboardProps) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect/onboard')
      const data = await response.json()
      
      if (response.ok) {
        setStatus(data)
      } else {
        setError(data.error || 'Failed to check status')
      }
    } catch (err) {
      console.error('Error checking status:', err)
      setError('Failed to load payment status')
    } finally {
      setLoading(false)
    }
  }

  const startOnboarding = async () => {
    setOnboarding(true)
    setError('')
    
    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (response.ok && data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to start onboarding')
        setOnboarding(false)
      }
    } catch (err) {
      console.error('Error starting onboarding:', err)
      setError('Failed to start onboarding')
      setOnboarding(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Payment Settings</h1>
          <p className="text-slate-600 mt-2">Loading your payment information...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  const isFullyOnboarded = status?.onboarded && status?.charges_enabled && status?.payouts_enabled

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">💰 Payment Settings</h1>
        <p className="text-slate-600 mt-2">
          Set up payments to receive sponsorships directly to your bank account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Onboarding Status Card */}
      <AnimatedCard className="p-6 mb-6 bg-gradient-to-br from-teal-50 to-purple-50 border border-teal-200">
        {!isFullyOnboarded ? (
          <>
            <div className="flex items-start gap-4">
              <div className="text-4xl">🏦</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Set Up Payments
                </h2>
                <p className="text-slate-700 mb-4">
                  Connect your bank account to receive 85% of all sponsorships directly. 
                  The platform keeps a 15% service fee.
                </p>
                
                {status && !status.onboarded && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ You need to complete Stripe onboarding to receive payments
                    </p>
                  </div>
                )}
                
                <button
                  onClick={startOnboarding}
                  disabled={onboarding}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {onboarding ? 'Redirecting to Stripe...' : status?.account_id ? 'Continue Onboarding' : 'Start Onboarding'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <div className="text-4xl">✅</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Payments Enabled
                </h2>
                <p className="text-slate-700 mb-4">
                  Your account is fully set up! You'll receive 85% of sponsorships directly to your bank account.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Status</div>
                    <div className="font-semibold text-green-600">Active</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Charges</div>
                    <div className="font-semibold text-green-600">Enabled</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Payouts</div>
                    <div className="font-semibold text-green-600">Enabled</div>
                  </div>
                </div>
                
                <button
                  onClick={startOnboarding}
                  className="mt-4 text-teal-600 hover:text-teal-700 font-medium text-sm"
                >
                  Update Payment Settings →
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatedCard>

      {/* How It Works */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">💡 How Payments Work</h3>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold">
              1
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Brand Sponsors Your Community</h4>
              <p className="text-sm text-slate-600">
                A brand pays for sponsorship (e.g., $1,000 MXN)
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold">
              2
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Automatic Split</h4>
              <p className="text-sm text-slate-600">
                • 85% ($850) goes to your bank account<br />
                • 15% ($150) platform service fee
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold">
              3
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Instant Payout</h4>
              <p className="text-sm text-slate-600">
                Funds are automatically transferred to your bank account within 2-7 business days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatedCard className="p-4 border border-slate-200">
          <div className="text-2xl mb-2">🚀</div>
          <h4 className="font-semibold text-slate-900 mb-1">Fast Payouts</h4>
          <p className="text-sm text-slate-600">
            Receive funds directly within days, not weeks
          </p>
        </AnimatedCard>
        
        <AnimatedCard className="p-4 border border-slate-200">
          <div className="text-2xl mb-2">🔒</div>
          <h4 className="font-semibold text-slate-900 mb-1">Secure</h4>
          <p className="text-sm text-slate-600">
            Powered by Stripe, the industry standard for payments
          </p>
        </AnimatedCard>
        
        <AnimatedCard className="p-4 border border-slate-200">
          <div className="text-2xl mb-2">📊</div>
          <h4 className="font-semibold text-slate-900 mb-1">Transparent</h4>
          <p className="text-sm text-slate-600">
            Track all transactions and payouts in your Stripe dashboard
          </p>
        </AnimatedCard>
        
        <AnimatedCard className="p-4 border border-slate-200">
          <div className="text-2xl mb-2">💼</div>
          <h4 className="font-semibold text-slate-900 mb-1">Tax Ready</h4>
          <p className="text-sm text-slate-600">
            Get all documentation needed for Mexican tax compliance (SAT)
          </p>
        </AnimatedCard>
      </div>

      {/* Help Section */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Need Help?</h4>
        <p className="text-sm text-blue-800">
          If you have questions about payment setup or need assistance, please contact us at{' '}
          <a href="mailto:support@crowdconscious.app" className="underline">
            support@crowdconscious.app
          </a>
        </p>
      </div>
    </div>
  )
}

