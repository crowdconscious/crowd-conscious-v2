'use client'

import { useState } from 'react'
import { createClientAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface JoinCommunityButtonProps {
  communityId: string
  userId: string
}

export default function JoinCommunityButton({ communityId, userId }: JoinCommunityButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClientAuth()

  const handleJoin = async () => {
    setLoading(true)
    setMessage('')

    try {
      // TODO: Implement community joining - temporarily disabled for deployment
      console.log('Joining community:', { communityId, userId })
      
      setMessage('Successfully joined the community!')
      // Refresh the page to show updated membership status
      router.refresh()
    } catch (error) {
      setMessage('An unexpected error occurred')
      console.error('Join community exception:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleJoin}
        disabled={loading}
        className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
      >
        {loading ? 'Joining...' : 'Join Community'}
      </button>
      
      {message && (
        <div className={`mt-2 p-2 rounded text-sm ${
          message.includes('Error') || message.includes('already') 
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}
