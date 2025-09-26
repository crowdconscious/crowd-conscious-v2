'use client'

import { useState } from 'react'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'

export default function EmailTemplatesClient() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const templates = [
    {
      id: 'welcome-user',
      name: 'Welcome Email (User)',
      description: 'Welcome email for new community members',
      previewUrl: '/api/email-previews/welcome?type=user',
      testEndpoint: '/api/test/send-welcome-email'
    },
    {
      id: 'welcome-brand',
      name: 'Welcome Email (Brand)',
      description: 'Welcome email for new brand partners',
      previewUrl: '/api/email-previews/welcome?type=brand',
      testEndpoint: '/api/test/send-welcome-email'
    },
    {
      id: 'monthly-report',
      name: 'Monthly Impact Report',
      description: 'Comprehensive monthly activity and impact summary',
      previewUrl: '/api/email-previews/monthly-report',
      testEndpoint: '/api/test/send-monthly-report'
    },
    {
      id: 'sponsorship-notification',
      name: 'Sponsorship Opportunity',
      description: 'New sponsorship opportunity for brands',
      previewUrl: '/api/email-previews/sponsorship?type=notification',
      testEndpoint: '/api/test/send-sponsorship-email'
    },
    {
      id: 'sponsorship-approval',
      name: 'Sponsorship Approved',
      description: 'Sponsorship approval with payment request',
      previewUrl: '/api/email-previews/sponsorship?type=approval',
      testEndpoint: '/api/test/send-sponsorship-approval'
    },
    {
      id: 'achievement',
      name: 'Achievement Unlocked',
      description: 'Gamification achievement notification',
      previewUrl: '/api/email-previews/achievement',
      testEndpoint: '/api/test/send-achievement'
    }
  ]

  const sendTestEmail = async (templateId: string, endpoint: string) => {
    if (!testEmail) {
      setResult({ success: false, message: 'Please enter a test email address' })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          templateType: templateId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: 'Test email sent successfully!' })
      } else {
        setResult({ success: false, message: data.error || 'Failed to send test email' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Test Email Input */}
      <AnimatedCard className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">📧 Test Email Configuration</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Test Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <AnimatedButton
            onClick={() => setResult(null)}
            variant="ghost"
            size="sm"
            className="mb-0"
          >
            Clear Results
          </AnimatedButton>
        </div>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${
            result.success 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <span>{result.success ? '✅' : '❌'}</span>
              <span className="font-medium">{result.message}</span>
            </div>
          </div>
        )}
      </AnimatedCard>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <AnimatedCard key={template.id} className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {template.description}
              </p>
            </div>

            <div className="space-y-3">
              {/* Preview Button */}
              <AnimatedButton
                onClick={() => window.open(template.previewUrl, '_blank')}
                variant="secondary"
                className="w-full"
              >
                👁️ Preview Template
              </AnimatedButton>

              {/* Send Test Button */}
              <AnimatedButton
                onClick={() => sendTestEmail(template.id, template.testEndpoint)}
                disabled={!testEmail || isLoading}
                className="w-full"
              >
                {isLoading ? '📤 Sending...' : '📧 Send Test Email'}
              </AnimatedButton>
            </div>

            {/* Template Features */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-medium text-slate-500 mb-2">FEATURES</h4>
              <div className="flex flex-wrap gap-1">
                {template.id.includes('welcome') && (
                  <>
                    <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded">
                      Gradient Header
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      Action Cards
                    </span>
                  </>
                )}
                {template.id === 'monthly-report' && (
                  <>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Charts
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Progress Bars
                    </span>
                  </>
                )}
                {template.id.includes('sponsorship') && (
                  <>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Funding Progress
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                      CTA Buttons
                    </span>
                  </>
                )}
                {template.id === 'achievement' && (
                  <>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      Confetti Animation
                    </span>
                    <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded">
                      Badge Design
                    </span>
                  </>
                )}
                <span className="text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded">
                  Mobile Responsive
                </span>
                <span className="text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded">
                  Dark Mode
                </span>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Technical Details */}
      <AnimatedCard className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">🛠️ Technical Implementation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-slate-800 mb-3">Email Features</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                React Email components with TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Inline CSS for maximum compatibility
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Mobile-responsive table layouts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Dark mode media query support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Brand gradient themes matching UI
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Professional typography (Inter font)
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-800 mb-3">Integration</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Resend API for reliable delivery
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Custom domain support ready
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Batch email sending capabilities
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Error handling and retry logic
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Email preview and testing routes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Production-ready templates
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="font-medium text-slate-800 mb-2">🚀 Next Steps for Production</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
            <li>Verify custom domain in Resend dashboard</li>
            <li>Update FROM_EMAIL environment variable</li>
            <li>Test email deliverability to major providers</li>
            <li>Set up SPF, DKIM, and DMARC records</li>
            <li>Monitor email engagement metrics</li>
          </ol>
        </div>
      </AnimatedCard>
    </div>
  )
}
