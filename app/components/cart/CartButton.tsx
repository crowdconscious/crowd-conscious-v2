'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import CartSidebar from './CartSidebar'

export default function CartButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [itemCount, setItemCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch cart item count
  const fetchCartCount = async () => {
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setItemCount(data.summary.item_count || 0)
      }
    } catch (error) {
      console.error('Error fetching cart count:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCartCount()
  }, [])

  // Refresh cart count when cart updates
  const handleCartUpdate = () => {
    fetchCartCount()
  }

  return (
    <>
      {/* Floating Cart Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform duration-300 flex items-center gap-3"
        aria-label="Open shopping cart"
      >
        <ShoppingCart className="w-6 h-6" />
        {itemCount > 0 && !isLoading && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center animate-bounce">
            {itemCount}
          </span>
        )}
      </button>

      {/* Cart Sidebar */}
      <CartSidebar 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onUpdate={handleCartUpdate}
      />
    </>
  )
}

