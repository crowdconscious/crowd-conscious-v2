'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PaymentsSuccessPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/dashboard/payments')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Payments Enabled!
        </h1>
        <p className="text-slate-600 mb-6">
          Your Stripe Connect account has been successfully set up. You can now receive sponsorship payments directly to your bank account!
        </p>
        
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg mb-6">
          <p className="text-sm text-teal-800">
            💰 You'll receive <span className="font-bold">85%</span> of all sponsorships directly to your account
          </p>
        </div>
        
        <p className="text-sm text-slate-500 mb-6">
          Redirecting to payment dashboard in {countdown} seconds...
        </p>
        
        <Link 
          href="/dashboard/payments"
          className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Go to Payment Dashboard
        </Link>
      </div>
    </div>
  )
}

