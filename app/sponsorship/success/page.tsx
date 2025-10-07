'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function SponsorshipSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sponsorship, setSponsorship] = useState<any>(null)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      verifyPayment()
    }
  }, [sessionId])

  const verifyPayment = async () => {
    try {
      const response = await fetch(`/api/verify-payment?session_id=${sessionId}`)
      const data = await response.json()
      
      if (data.success) {
        setSponsorship(data.sponsorship)
      }
    } catch (error) {
      console.error('Failed to verify payment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying your sponsorship...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl">🎉</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Thank You for Your Sponsorship!
            </h1>
            <p className="text-teal-100 text-lg">
              Your support makes a real difference
            </p>
          </div>

          {/* Details */}
          <div className="p-8 space-y-6">
            {sponsorship && (
              <>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600">Sponsorship Amount</span>
                    <span className="text-3xl font-bold text-teal-600">
                      ${sponsorship.amount?.toLocaleString()} MXN
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Type</span>
                      <span className="font-medium text-slate-900">
                        {sponsorship.sponsor_type === 'business' ? '🏢 Business' : '👤 Individual'}
                      </span>
                    </div>
                    
                    {sponsorship.brand_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Company</span>
                        <span className="font-medium text-slate-900">
                          {sponsorship.brand_name}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status</span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        ✓ Paid
                      </span>
                    </div>
                  </div>
                </div>

                {/* What's Next */}
                <div className="space-y-4">
                  <h2 className="font-semibold text-slate-900 text-lg">What Happens Next?</h2>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold">
                        1
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Confirmation Email</div>
                        <div className="text-sm text-slate-600">
                          You'll receive a receipt at {sponsorship.sponsor_email}
                        </div>
                      </div>
                    </div>

                    {sponsorship.sponsor_type === 'business' && sponsorship.tax_id && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold">
                          2
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">Tax Receipt (CFDI)</div>
                          <div className="text-sm text-slate-600">
                            Your tax-deductible receipt will be sent within 48 hours
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold">
                        {sponsorship.sponsor_type === 'business' && sponsorship.tax_id ? '3' : '2'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Brand Recognition</div>
                        <div className="text-sm text-slate-600">
                          {sponsorship.sponsor_type === 'business' 
                            ? 'Your logo will appear on the community page and our Trusted Brands section'
                            : 'Your name will be listed as a valued sponsor'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold">
                        {sponsorship.sponsor_type === 'business' && sponsorship.tax_id ? '4' : '3'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Impact Reports</div>
                        <div className="text-sm text-slate-600">
                          Monthly updates on how your sponsorship is making a difference
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Sharing */}
                <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-6 rounded-xl">
                  <h3 className="font-semibold text-slate-900 mb-3">Share Your Impact</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Let others know you're making a difference!
                  </p>
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Share on Twitter
                    </button>
                    <button className="flex-1 px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors">
                      Share on Facebook
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Link href="/dashboard" className="flex-1">
                <button className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors">
                  Go to Dashboard
                </button>
              </Link>
              <Link href="/communities" className="flex-1">
                <button className="w-full px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                  Browse Communities
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:comunidad@crowdconscious.app" className="text-teal-600 hover:underline">
              comunidad@crowdconscious.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SponsorshipSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <SponsorshipSuccessContent />
    </Suspense>
  )
}
