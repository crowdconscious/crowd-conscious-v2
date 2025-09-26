'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { AnimatedButton } from './ui/UIComponents'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  sponsorshipId: string
  amount: number
  onSuccess: () => void
  onError: (error: string) => void
}

function CheckoutForm({ sponsorshipId, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    try {
      // Create payment intent on our server
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sponsorshipId,
          amount,
        }),
      })

      const { clientSecret, platformFee, netAmount, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      setPaymentDetails({ platformFee: platformFee / 100, netAmount: netAmount / 100 })

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement)
      
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (confirmError) {
        throw new Error(confirmError.message)
      }

      // Payment succeeded
      onSuccess()
    } catch (error: any) {
      onError(error.message || 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const platformFee = (amount * 15) / 100
  const netAmount = amount - platformFee

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Breakdown */}
      <div className="bg-slate-50 p-4 rounded-lg space-y-2">
        <h3 className="font-semibold text-slate-900">Payment Breakdown</h3>
        <div className="flex justify-between text-sm">
          <span>Sponsorship Amount:</span>
          <span className="font-medium">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-orange-600">
          <span>Platform Fee (15%):</span>
          <span>-${platformFee.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Community Receives:</span>
          <span className="text-green-600">${netAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Card Element */}
      <div className="border border-slate-300 rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Card Information
        </label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>

      {/* Payment Button */}
      <AnimatedButton
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Processing Payment...
          </span>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </AnimatedButton>

      {/* Legal Notice */}
      <p className="text-xs text-slate-500 text-center">
        By completing this payment, you agree to sponsor this community need. 
        Funds will be released to the community upon payment confirmation.
      </p>
    </form>
  )
}

export default function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  )
}
