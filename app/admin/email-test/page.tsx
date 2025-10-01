'use client'

import { useState } from 'react'

export default function EmailTestPage() {
  const [testEmail, setTestEmail] = useState('')
  const [testName, setTestName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testEmailType = async (type: string) => {
    if (!testEmail) {
      alert('Please enter an email address')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          email: testEmail,
          name: testName || 'Test User'
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Email test error:', error)
      setResult({ error: 'Failed to send test email' })
    } finally {
      setLoading(false)
    }
  }

  const testSponsorshipEmail = async () => {
    if (!testEmail) {
      alert('Please enter an email address')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'sponsorship',
          email: testEmail,
          testData: {
            brandName: 'EcoTech Solutions',
            needTitle: 'Community Garden Project',
            amount: 2500,
            communityName: 'Green Valley Community'
          }
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Email test error:', error)
      setResult({ error: 'Failed to send test email' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Email System Test</h1>
          <p className="text-slate-600 mt-2">Test the email system functionality</p>
        </div>

        {/* Test Form */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Test Email Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name (optional)
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Test User"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => testEmailType('welcome')}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Test Welcome Email'}
            </button>
            
            <button
              onClick={() => testEmailType('welcome-brand')}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Test Brand Email'}
            </button>
            
            <button
              onClick={testSponsorshipEmail}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Test Sponsorship Email'}
            </button>
            
            <button
              onClick={() => testEmailType('custom')}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Test Custom Email'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Test Results</h2>
            
            {result.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-green-600 text-2xl mr-3">✅</div>
                  <div>
                    <h3 className="text-green-800 font-medium">Email Sent Successfully!</h3>
                    <p className="text-green-700 text-sm mt-1">{result.message}</p>
                    {result.timestamp && (
                      <p className="text-green-600 text-xs mt-2">
                        Sent at: {new Date(result.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-red-600 text-2xl mr-3">❌</div>
                  <div>
                    <h3 className="text-red-800 font-medium">Email Failed</h3>
                    <p className="text-red-700 text-sm mt-1">{result.error || 'Unknown error'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">📧 Email Testing Instructions</h2>
          <div className="text-blue-800 space-y-2">
            <p><strong>1. Welcome Email:</strong> Tests the standard user welcome email template</p>
            <p><strong>2. Brand Email:</strong> Tests the brand partner welcome email template</p>
            <p><strong>3. Sponsorship Email:</strong> Tests the sponsorship approval email with payment link</p>
            <p><strong>4. Custom Email:</strong> Tests a simple custom email template</p>
            <p className="mt-4 text-sm">
              <strong>Note:</strong> Make sure to check your email inbox (including spam folder) after sending test emails.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

