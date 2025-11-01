'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/app/components/ui/Button'
import { ShoppingCart, Loader2, CheckCircle } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface MarketplacePurchaseButtonProps {
  moduleId: string
  moduleTitle: string
  basePrice: number
  employeeCount: number
  onSuccess?: () => void
}

export function MarketplacePurchaseButton({
  moduleId,
  moduleTitle,
  basePrice,
  employeeCount,
  onSuccess,
}: MarketplacePurchaseButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load Stripe
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // Create payment method (in production, use Stripe Elements)
      // For now, we'll use a test card
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          // This would come from Stripe Elements in production
          token: 'tok_visa', // Test token
        },
      })

      if (pmError || !paymentMethod) {
        throw new Error(pmError?.message || 'Failed to create payment method')
      }

      // Process purchase
      const response = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moduleId,
          employeeCount,
          paymentMethodId: paymentMethod.id,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        // Check if additional action required (3D Secure)
        if (result.requires_action && result.client_secret) {
          const { error: confirmError } = await stripe.confirmCardPayment(
            result.client_secret
          )
          
          if (confirmError) {
            throw new Error(confirmError.message)
          }
          
          // Retry purchase after confirmation
          return handlePurchase()
        }
        
        throw new Error(result.error || 'Purchase failed')
      }

      // Success!
      setSuccess(true)
      
      // Show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          // Redirect to corporate dashboard
          router.push('/corporate/dashboard')
        }
      }, 2000)

    } catch (err: any) {
      console.error('Purchase error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-5 h-5" />
        <span className="font-medium">¡Compra Exitosa!</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePurchase}
        disabled={loading}
        size="lg"
        className="w-full bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-700 hover:to-purple-700"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5 mr-2" />
            Comprar Ahora - ${basePrice.toLocaleString('es-MX')} MXN
          </>
        )}
      </Button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="text-sm text-slate-600 space-y-1">
        <p>
          <strong>Incluye:</strong> {employeeCount} empleados
        </p>
        <p>
          <strong>Distribución de ingresos:</strong>
        </p>
        <ul className="ml-4 space-y-1 text-xs">
          <li>• 50% a la comunidad creadora</li>
          <li>• 30% a la plataforma</li>
          <li>• 20% al creador individual</li>
        </ul>
      </div>
    </div>
  )
}

