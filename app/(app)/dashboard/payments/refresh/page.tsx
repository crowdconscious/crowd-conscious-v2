'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentsRefreshPage() {
  const router = useRouter()

  useEffect(() => {
    // Immediately start new onboarding
    const refreshOnboarding = async () => {
      try {
        const response = await fetch('/api/stripe/connect/onboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        
        if (response.ok && data.url) {
          window.location.href = data.url
        } else {
          // If error, redirect to payments page
          router.push('/dashboard/payments')
        }
      } catch (error) {
        console.error('Error refreshing onboarding:', error)
        router.push('/dashboard/payments')
      }
    }

    refreshOnboarding()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Refreshing Onboarding...
        </h1>
        <p className="text-slate-600">
          Please wait while we redirect you back to Stripe
        </p>
      </div>
    </div>
  )
}

