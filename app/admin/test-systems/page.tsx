'use client'

import { useState } from 'react'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'

export default function TestSystemsPage() {
  const [emailTest, setEmailTest] = useState({
    email: '',
    name: '',
    userType: 'user'
  })
  const [sponsorshipTest, setSponsorshipTest] = useState({
    email: '',
    brandName: '',
    needTitle: '',
    amount: '',
    communityName: ''
  })
  const [results, setResults] = useState<{[key: string]: any}>({})
  const [loading, setLoading] = useState<{[key: string]: boolean}>({})

  const testWelcomeEmail = async () => {
    setLoading(prev => ({ ...prev, welcome: true }))
    try {
      const response = await fetch('/api/test/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailTest)
      })
      const result = await response.json()
      setResults(prev => ({ ...prev, welcome: result }))
    } catch (error) {
      setResults(prev => ({ ...prev, welcome: { error: 'Network error' } }))
    } finally {
      setLoading(prev => ({ ...prev, welcome: false }))
    }
  }

  const testSponsorshipEmail = async () => {
    setLoading(prev => ({ ...prev, sponsorship: true }))
    try {
      const response = await fetch('/api/test/send-sponsorship-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sponsorshipTest)
      })
      const result = await response.json()
      setResults(prev => ({ ...prev, sponsorship: result }))
    } catch (error) {
      setResults(prev => ({ ...prev, sponsorship: { error: 'Network error' } }))
    } finally {
      setLoading(prev => ({ ...prev, sponsorship: false }))
    }
  }

  const testStripeConnection = async () => {
    setLoading(prev => ({ ...prev, stripe: true }))
    try {
      // Test creating a payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorshipId: 'test-sponsorship',
          amount: 100
        })
      })
      const result = await response.json()
      setResults(prev => ({ 
        ...prev, 
        stripe: result.error ? { error: result.error } : { 
          success: true, 
          message: 'Stripe connection working! (Note: This will fail because test sponsorship doesn\'t exist)',
          details: 'This error is expected - it means Stripe is configured correctly.'
        }
      }))
    } catch (error) {
      setResults(prev => ({ ...prev, stripe: { error: 'Network error' } }))
    } finally {
      setLoading(prev => ({ ...prev, stripe: false }))
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">System Testing</h1>
        <p className="text-slate-600">Test email and payment systems</p>
      </div>

      {/* Email Testing */}
      <AnimatedCard className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">📧 Email System Testing</h2>
        
        {/* Welcome Email Test */}
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">Welcome Email Test</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="email"
              placeholder="Email address"
              value={emailTest.email}
              onChange={(e) => setEmailTest(prev => ({ ...prev, email: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Name"
              value={emailTest.name}
              onChange={(e) => setEmailTest(prev => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <select
              value={emailTest.userType}
              onChange={(e) => setEmailTest(prev => ({ ...prev, userType: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="user">User</option>
              <option value="brand">Brand</option>
            </select>
          </div>
          <AnimatedButton
            onClick={testWelcomeEmail}
            disabled={loading.welcome || !emailTest.email || !emailTest.name}
            className="mb-3"
          >
            {loading.welcome ? 'Sending...' : 'Send Test Welcome Email'}
          </AnimatedButton>
          {results.welcome && (
            <div className={`p-3 rounded-lg text-sm ${
              results.welcome.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {results.welcome.message || results.welcome.error}
            </div>
          )}
        </div>

        {/* Sponsorship Email Test */}
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">Sponsorship Approval Email Test</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="email"
              placeholder="Brand email"
              value={sponsorshipTest.email}
              onChange={(e) => setSponsorshipTest(prev => ({ ...prev, email: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Brand name"
              value={sponsorshipTest.brandName}
              onChange={(e) => setSponsorshipTest(prev => ({ ...prev, brandName: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Need title"
              value={sponsorshipTest.needTitle}
              onChange={(e) => setSponsorshipTest(prev => ({ ...prev, needTitle: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="number"
              placeholder="Amount (USD)"
              value={sponsorshipTest.amount}
              onChange={(e) => setSponsorshipTest(prev => ({ ...prev, amount: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Community name"
              value={sponsorshipTest.communityName}
              onChange={(e) => setSponsorshipTest(prev => ({ ...prev, communityName: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-lg md:col-span-2"
            />
          </div>
          <AnimatedButton
            onClick={testSponsorshipEmail}
            disabled={loading.sponsorship || !sponsorshipTest.email || !sponsorshipTest.brandName}
            className="mb-3"
          >
            {loading.sponsorship ? 'Sending...' : 'Send Test Sponsorship Email'}
          </AnimatedButton>
          {results.sponsorship && (
            <div className={`p-3 rounded-lg text-sm ${
              results.sponsorship.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {results.sponsorship.message || results.sponsorship.error}
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* Payment Testing */}
      <AnimatedCard className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">💳 Payment System Testing</h2>
        
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">Stripe Connection Test</h3>
          <p className="text-slate-600 text-sm mb-4">
            This tests if Stripe is properly configured and can create payment intents.
          </p>
          <AnimatedButton
            onClick={testStripeConnection}
            disabled={loading.stripe}
            className="mb-3"
          >
            {loading.stripe ? 'Testing...' : 'Test Stripe Connection'}
          </AnimatedButton>
          {results.stripe && (
            <div className={`p-3 rounded-lg text-sm ${
              results.stripe.success ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
            }`}>
              <div className="font-medium">{results.stripe.message || results.stripe.error}</div>
              {results.stripe.details && (
                <div className="text-xs mt-1">{results.stripe.details}</div>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Payment Testing Guide</h3>
          <div className="text-blue-800 text-sm space-y-2">
            <p><strong>To test the full payment flow:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Create a community and add a need with funding goal</li>
              <li>Switch to brand mode and apply to sponsor the need</li>
              <li>As admin, approve the sponsorship application</li>
              <li>Brand receives email with payment link</li>
              <li>Use Stripe test card: <code className="bg-blue-100 px-1 rounded">4242 4242 4242 4242</code></li>
              <li>Payment processes with 15% platform fee</li>
              <li>Community receives funding</li>
            </ol>
          </div>
        </div>
      </AnimatedCard>

      {/* Environment Check */}
      <AnimatedCard className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">🔧 Environment Check</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Stripe Publishable Key:</span>
              <span className={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>App URL:</span>
              <span className={process.env.NEXT_PUBLIC_APP_URL ? 'text-green-600' : 'text-yellow-600'}>
                {process.env.NEXT_PUBLIC_APP_URL || 'Using localhost'}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            <p>Environment variables are checked client-side where possible.</p>
            <p>Server-side variables (Stripe Secret, Resend API) are verified when testing.</p>
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}
