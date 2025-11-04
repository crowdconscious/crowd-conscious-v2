'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Plus, Minus, Trash2, ShoppingBag, Loader2, AlertCircle } from 'lucide-react'

interface CartItem {
  id: string
  module_id: string
  employee_count: number
  price_snapshot: number
  added_at: string
  module: {
    id: string
    title: string
    description: string
    slug: string
    core_value: string
    difficulty_level: string
    estimated_duration_hours: number
    thumbnail_url: string | null
    creator_name: string
  }
  total_price: number
  price_per_employee: number
}

interface CartSidebarProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function CartSidebar({ isOpen, onClose, onUpdate }: CartSidebarProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())
  const [cartSummary, setCartSummary] = useState({
    item_count: 0,
    total_price: 0,
    total_employees: 0
  })

  // Fetch cart data
  const fetchCart = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/cart')
      
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items || [])
        setCartSummary(data.summary)
      } else if (response.status === 401 || response.status === 403) {
        setError('No autorizado. Por favor inicia sesión como administrador corporativo.')
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

  useEffect(() => {
    if (isOpen) {
      fetchCart()
    }
  }, [isOpen])

  // Update employee count
  const updateEmployeeCount = async (cartItemId: string, newCount: number) => {
    if (newCount < 1) return

    setUpdatingItems(prev => new Set(prev).add(cartItemId))

    try {
      const response = await fetch('/api/cart/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, employeeCount: newCount })
      })

      if (response.ok) {
        await fetchCart()
        onUpdate()
      } else {
        alert('Error al actualizar la cantidad')
      }
    } catch (error) {
      console.error('Error updating cart item:', error)
      alert('Error de conexión')
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(cartItemId)
        return newSet
      })
    }
  }

  // Remove item from cart
  const removeItem = async (cartItemId: string) => {
    setUpdatingItems(prev => new Set(prev).add(cartItemId))

    try {
      const response = await fetch('/api/cart/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId })
      })

      if (response.ok) {
        await fetchCart()
        onUpdate()
      } else {
        alert('Error al eliminar el artículo')
      }
    } catch (error) {
      console.error('Error removing cart item:', error)
      alert('Error de conexión')
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(cartItemId)
        return newSet
      })
    }
  }

  // Clear entire cart
  const clearCart = async () => {
    if (!confirm('¿Estás seguro de que quieres vaciar tu carrito?')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/cart/clear', {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchCart()
        onUpdate()
      } else {
        alert('Error al vaciar el carrito')
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
      alert('Error de conexión')
    } finally {
      setLoading(false)
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

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-7 h-7" />
                Tu Carrito
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-purple-100 text-sm">
              {cartSummary.item_count} {cartSummary.item_count === 1 ? 'módulo' : 'módulos'} • {cartSummary.total_employees} empleados
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
                  <ShoppingBag className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Carrito vacío</h3>
                <p className="text-slate-600 mb-6">Explora el marketplace y agrega módulos</p>
                <Link
                  href="/marketplace"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Explorar Marketplace
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl border border-slate-200">
                          {getCoreValueIcon(item.module.core_value)}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 mb-1 line-clamp-2">
                          {item.module.title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">
                          por {item.module.creator_name}
                        </p>

                        {/* Employee Count Adjuster */}
                        <div className="flex items-center gap-3 mb-3">
                          <button
                            onClick={() => updateEmployeeCount(item.id, item.employee_count - 50)}
                            disabled={item.employee_count <= 50 || updatingItems.has(item.id)}
                            className="p-2 bg-white border-2 border-slate-300 rounded-lg hover:border-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <div className="flex-1 text-center">
                            <div className="text-lg font-bold text-slate-900">
                              {item.employee_count}
                            </div>
                            <div className="text-xs text-slate-600">empleados</div>
                          </div>

                          <button
                            onClick={() => updateEmployeeCount(item.id, item.employee_count + 50)}
                            disabled={updatingItems.has(item.id)}
                            className="p-2 bg-white border-2 border-slate-300 rounded-lg hover:border-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xl font-bold text-purple-600">
                              {formatCurrency(item.total_price)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatCurrency(item.price_per_employee)} / empleado
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={updatingItems.has(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar del carrito"
                          >
                            {updatingItems.has(item.id) ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Clear Cart Button */}
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Vaciar carrito
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="border-t border-slate-200 p-6 bg-white">
              {/* Totals */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(cartSummary.total_price)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Empleados totales</span>
                  <span className="font-medium">{cartSummary.total_employees}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {formatCurrency(cartSummary.total_price)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/corporate/checkout"
                  onClick={onClose}
                  className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-center hover:scale-105 transition-transform shadow-lg"
                >
                  💳 Proceder al Pago
                </Link>
                <button
                  onClick={onClose}
                  className="w-full bg-white border-2 border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Continuar Comprando
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

