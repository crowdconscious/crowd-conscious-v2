'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
import PaymentForm from '@/components/PaymentForm'
import DashboardNavigation from '@/components/DashboardNavigation'

interface PaymentClientProps {
  user: any
  sponsorship: any
}

export default function PaymentClient({ user, sponsorship }: PaymentClientProps) {
  const router = useRouter()
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'error'>('pending')
  const [errorMessage, setErrorMessage] = useState('')

  const platformFee = (sponsorship.amount * 15) / 100
  const netAmount = sponsorship.amount - platformFee

  const handlePaymentSuccess = () => {
    setPaymentStatus('success')
    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
      router.push('/brand/dashboard?message=payment-success')
    }, 3000)
  }

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error')
    setErrorMessage(error)
  }

  if (paymentStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <DashboardNavigation customBackPath="/brand/dashboard" customBackLabel="Back to Dashboard" />
        
        <AnimatedCard className="p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-green-600 mb-4">Payment Successful!</h1>
          <p className="text-slate-700 mb-6">
            Thank you for sponsoring <strong>{sponsorship.community_content.title}</strong> in the <strong>{sponsorship.community_content.communities.name}</strong> community.
          </p>
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-green-800 font-medium">
              Your sponsorship of <strong>${sponsorship.amount.toLocaleString()}</strong> is now processing. 
              The community will receive <strong>${netAmount.toLocaleString()}</strong> to fund their need.
            </p>
          </div>
          <p className="text-slate-600 text-sm mb-6">
            You will receive a receipt via email shortly. You can track your sponsorship impact in your brand dashboard.
          </p>
          <Link href="/brand/dashboard">
            <AnimatedButton>Return to Dashboard</AnimatedButton>
          </Link>
        </AnimatedCard>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <DashboardNavigation customBackPath="/brand/dashboard" customBackLabel="Back to Dashboard" />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Complete Your Sponsorship</h1>
        <p className="text-slate-600">
          Secure payment powered by Stripe
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sponsorship Details */}
        <AnimatedCard className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Sponsorship Details</h2>
          
          {/* Community Info */}
          <div className="flex items-center gap-4 mb-6">
            {sponsorship.community_content.communities.image_url ? (
              <img 
                src={sponsorship.community_content.communities.image_url} 
                alt={sponsorship.community_content.communities.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏘️</span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-900">{sponsorship.community_content.communities.name}</h3>
              <p className="text-slate-600 text-sm">Community</p>
            </div>
          </div>

          {/* Need Details */}
          <div className="mb-6">
            <h4 className="font-semibold text-slate-900 mb-2">{sponsorship.community_content.title}</h4>
            {sponsorship.community_content.image_url && (
              <img 
                src={sponsorship.community_content.image_url} 
                alt={sponsorship.community_content.title}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            <p className="text-slate-700 text-sm line-clamp-3">{sponsorship.community_content.description}</p>
          </div>

          {/* Funding Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Funding Progress</span>
              <span className="font-medium">
                ${sponsorship.community_content.current_funding.toLocaleString()} / ${sponsorship.community_content.funding_goal.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-teal-600 h-2 rounded-full"
                style={{ 
                  width: `${Math.min(100, (sponsorship.community_content.current_funding / sponsorship.community_content.funding_goal) * 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Impact Preview */}
          <div className="bg-teal-50 p-4 rounded-lg">
            <h4 className="font-semibold text-teal-900 mb-2">Your Impact</h4>
            <p className="text-teal-800 text-sm">
              Your sponsorship will help fund this community need and create measurable social impact. 
              You'll receive impact reports and community recognition.
            </p>
          </div>
        </AnimatedCard>

        {/* Payment Form */}
        <AnimatedCard className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Payment Information</h2>
          
          {paymentStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <span>❌</span>
                <span className="font-medium">Payment Failed</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          <PaymentForm
            sponsorshipId={sponsorship.id}
            amount={sponsorship.amount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-2">
              <span>🔒</span>
              <span className="font-medium">Secure Payment</span>
            </div>
            <p className="text-slate-600 text-sm">
              Your payment is processed securely by Stripe. We never store your card information.
            </p>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
