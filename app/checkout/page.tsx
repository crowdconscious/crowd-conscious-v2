'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, ShoppingBag, Loader2, AlertCircle, CheckCircle, 
  Building2, Mail, CreditCard, Shield, Lock 
} from 'lucide-react'

interface CartItem {
  id: string
  module_id: string
  employee_count: number
  price_snapshot: number
  discounted_price?: number
  promo_code?: {
    code: string
    discount_type: string
    discount_value: number
  }
  module: {
    title: string
    core_value: string
    creator_name: string
  }
  total_price: number
  original_price: number
  discount_amount: number
}

interface CartSummary {
  item_count: number
  total_price: number
  original_total: number
  total_discount: number
  total_employees: number
  has_promo: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartSummary, setCartSummary] = useState<CartSummary>({
    item_count: 0,
    total_price: 0,
    original_total: 0,
    total_discount: 0,
    total_employees: 0,
    has_promo: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Fetch cart data
  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/cart')
      
      if (response.ok) {
        const data = await response.json()
        
        console.log('🛒 CHECKOUT PAGE - Cart API Response:', {
          items: data.items,
          summary: data.summary,
          has_promo: data.summary?.has_promo,
          total_discount: data.summary?.total_discount,
          original_total: data.summary?.original_total,
          total_price: data.summary?.total_price
        })
        
        setCartItems(data.items || [])
        setCartSummary(data.summary)
        
        console.log('🎯 CHECKOUT PAGE - State set to:', {
          cartSummary: data.summary
        })
        
        // If cart is empty, redirect to marketplace
        if (data.items.length === 0) {
          router.push('/marketplace')
        }
      } else {
        setError('Error al cargar el carrito')
      }
    } catch (err) {
      console.error('Error fetching cart:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!acceptedTerms) {
      alert('Por favor acepta los términos y condiciones')
      return
    }

    setProcessing(true)

    try {
      const response = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        alert(data.error || 'Error al procesar el pago')
        setProcessing(false)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error de conexión. Por favor intenta de nuevo.')
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCoreValueIcon = (coreValue: string) => {
    const icons: Record<string, string> = {
      clean_air: '🌬️',
      clean_water: '💧',
      safe_cities: '🏙️',
      zero_waste: '♻️',
      fair_trade: '🤝',
      biodiversity: '🌱'
    }
    return icons[coreValue] || '📘'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Cargando checkout...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-start gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          <Link
            href="/marketplace"
            className="block w-full bg-purple-600 text-white py-3 rounded-xl font-medium text-center hover:bg-purple-700 transition-colors"
          >
            Volver al Marketplace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/marketplace"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-purple-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Marketplace
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Cart Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                Finalizar Compra
              </h1>
              <p className="text-slate-600">
                Revisa tu pedido y completa el pago de forma segura
              </p>
            </div>

            {/* Cart Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <ShoppingBag className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-slate-900">
                  Resumen del Pedido ({cartSummary.item_count} {cartSummary.item_count === 1 ? 'módulo' : 'módulos'})
                </h2>
              </div>

              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl border border-slate-200">
                        {getCoreValueIcon(item.module.core_value)}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 mb-1">
                        {item.module.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">
                        por {item.module.creator_name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>{item.employee_count} empleados</span>
                        <span>•</span>
                        <span className="font-medium text-purple-600">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-slate-900">Método de Pago</h2>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-purple-300">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Pago Seguro con Stripe</h3>
                    <p className="text-sm text-slate-700 mb-3">
                      Procesamos tu pago de forma segura a través de Stripe. Aceptamos:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-white rounded-lg text-sm font-medium border border-slate-200">
                        💳 Tarjetas de crédito
                      </span>
                      <span className="px-3 py-1 bg-white rounded-lg text-sm font-medium border border-slate-200">
                        💳 Tarjetas de débito
                      </span>
                      <span className="px-3 py-1 bg-white rounded-lg text-sm font-medium border border-slate-200">
                        🏦 Transferencia
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-600"
                />
                <span className="text-sm text-slate-700">
                  Acepto los{' '}
                  <Link href="/terms" className="text-purple-600 hover:text-purple-700 font-medium">
                    términos y condiciones
                  </Link>
                  {' '}y la{' '}
                  <Link href="/privacy" className="text-purple-600 hover:text-purple-700 font-medium">
                    política de privacidad
                  </Link>
                  . Entiendo que al completar esta compra, mis empleados serán automáticamente inscritos en los módulos seleccionados.
                </span>
              </label>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Resumen de Compra</h2>

              {/* Summary Items */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-slate-700">
                  <span>Módulos ({cartSummary.item_count})</span>
                  <span className={`font-medium ${cartSummary.has_promo ? 'line-through text-slate-400' : ''}`}>
                    {formatCurrency(cartSummary.has_promo ? cartSummary.original_total : cartSummary.total_price)}
                  </span>
                </div>
                {(() => {
                  console.log('💳 RENDERING SUMMARY:', {
                    has_promo: cartSummary.has_promo,
                    total_discount: cartSummary.total_discount,
                    should_show_discount: cartSummary.has_promo && cartSummary.total_discount > 0,
                    promo_code: cartItems[0]?.promo_code
                  })
                  return null
                })()}
                {cartSummary.has_promo && cartSummary.total_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        {cartItems[0]?.promo_code?.code}
                      </span>
                      Descuento
                    </span>
                    <span className="font-bold">-{formatCurrency(cartSummary.total_discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Empleados totales</span>
                  <span className="font-medium">{cartSummary.total_employees}</span>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between mb-1">
                    <span className="text-lg font-bold text-slate-900">Total a pagar</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {formatCurrency(cartSummary.total_price)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 text-right">
                    {formatCurrency(Math.round(cartSummary.total_price / cartSummary.total_employees))} por empleado
                  </p>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={processing || !acceptedTerms}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Pagar de Forma Segura
                  </>
                )}
              </button>

              {/* Security Badges */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Pago 100% seguro</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Encriptación SSL</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Inscripción automática de empleados</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

