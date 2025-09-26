'use client'

import { useState } from 'react'
import { createClientAuth } from '@/lib/auth'

interface VoteButtonProps {
  contentId: string
  userId: string
  onVoteUpdate: () => void
}

export default function VoteButton({ contentId, userId, onVoteUpdate }: VoteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const supabase = createClientAuth()

  const handleVote = async (vote: 'approve' | 'reject') => {
    setLoading(true)
    setMessage('')

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', userId)
        .single()

      if (existingVote) {
        setMessage('You have already voted on this content')
        setLoading(false)
        return
      }

      // Get user's voting weight from community membership
      const { data: membership } = await supabase
        .from('community_members')
        .select('voting_power, role')
        .eq('user_id', userId)
        .single()

      const weight = (membership as any)?.voting_power || 1

      // Submit vote
      const { error } = await supabase
        .from('votes')
        .insert({
          content_id: contentId,
          user_id: userId,
          vote: vote,
          weight: weight
        } as any)

      if (error) {
        setMessage('Error submitting vote. Please try again.')
        console.error('Vote error:', error)
      } else {
        setMessage(`Vote submitted: ${vote}`)
        onVoteUpdate()
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
      console.error('Vote exception:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => handleVote('approve')}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Voting...' : 'Approve'}
        </button>
        <button
          onClick={() => handleVote('reject')}
          disabled={loading}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Voting...' : 'Reject'}
        </button>
      </div>
      
      {message && (
        <div className={`p-2 rounded text-sm ${
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
