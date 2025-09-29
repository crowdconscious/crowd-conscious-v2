'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EnhancedCommunityDemo() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to real communities page after 2 seconds
    const timer = setTimeout(() => {
      router.push('/communities')
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div className="text-6xl mb-4">🔄</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Redirecting to Real App</h1>
        <p className="text-gray-600 mb-6">
          This demo page is being replaced with real data. Redirecting you to the live communities page...
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-teal-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
        </div>
        <a 
          href="/communities" 
          className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          Go Now →
        </a>
      </div>
    </div>
  )
}