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
      // Insert membership into community_members table
      const { data, error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: userId,
          role: 'member',  // Default role
          voting_power: 1  // Default voting power for members
        })
        .select()
        .single()

      if (error) {
        // Check if already a member
        if (error.code === '23505') { // Unique constraint violation
          setMessage('You are already a member of this community')
        } else {
          console.error('Error joining community:', error)
          setMessage('Error: ' + error.message)
        }
        return
      }
      
      setMessage('Successfully joined the community!')
      
      // Refresh the page to show updated membership status
      setTimeout(() => {
        router.refresh()
      }, 1000)
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
