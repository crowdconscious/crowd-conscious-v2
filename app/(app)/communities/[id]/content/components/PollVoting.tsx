'use client'

import { useState, useEffect } from 'react'
import { createClientAuth } from '@/lib/auth'
import { addToast } from '@/components/NotificationSystem'
import { useUserTier } from '@/hooks/useUserTier'
import confetti from 'canvas-confetti'

interface PollOption {
  id: string
  option_text: string
  vote_count: number
}

interface PollVotingProps {
  contentId: string
  pollOptions: PollOption[]
  userVote: Array<{ poll_option_id: string }> | null
  pollType: string
  onVoteUpdate: () => void
}

export default function PollVoting({ 
  contentId, 
  pollOptions, 
  userVote, 
  pollType,
  onVoteUpdate 
}: PollVotingProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientAuth()
  const { refetch: refetchTier } = useUserTier()

  // Set up real-time subscription for poll vote updates
  useEffect(() => {
    const channel = supabase
      .channel(`poll_votes_${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `content_id=eq.${contentId}`
        },
        (payload) => {
          console.log('🗳️ Real-time vote update:', payload)
          onVoteUpdate() // Refresh poll data
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [contentId, onVoteUpdate])

  const hasVoted = userVote && userVote.length > 0
  const userVotedOptionId = hasVoted ? userVote[0].poll_option_id : null

  const handleVote = async (optionId: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to vote')
        setLoading(false)
        return
      }

      // Insert vote (the trigger will handle updating vote counts)
      const { error: voteError } = await (supabase as any)
        .from('poll_votes')
        .upsert({
          poll_option_id: optionId,
          user_id: user.id,
          content_id: contentId
        }, {
          onConflict: 'user_id,content_id'
        })

      if (voteError) {
        setError(voteError.message)
      } else {
        // ✅ PHASE 3: Show celebration toast with XP
        // The XP is awarded via database trigger, so we fetch it
        try {
          // Small confetti burst for voting
          confetti({
            particleCount: 30,
            spread: 60,
            origin: { y: 0.6 }
          })
          
          // Show toast notification
          addToast({
            type: 'success',
            title: 'Vote Cast! 🗳️',
            message: 'Thanks for participating! You earned XP for voting.',
            duration: 4000
          })
          
          // Refetch tier to show updated XP
          await refetchTier()
        } catch (err) {
          console.error('Error showing vote celebration:', err)
        }
        
        onVoteUpdate() // Refresh the content list
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getTotalVotes = () => {
    return pollOptions.reduce((sum, option) => sum + option.vote_count, 0)
  }

  const getPercentage = (votes: number) => {
    const total = getTotalVotes()
    return total > 0 ? (votes / total) * 100 : 0
  }

  if (pollType === 'yes_no') {
    const yesVotes = pollOptions.find(o => o.option_text.toLowerCase() === 'yes')?.vote_count || 0
    const noVotes = pollOptions.find(o => o.option_text.toLowerCase() === 'no')?.vote_count || 0
    const total = yesVotes + noVotes

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-slate-900">Vote on this proposal</h4>
        
        {hasVoted ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">You voted: <span className="font-medium">{
              pollOptions.find(o => o.id === userVotedOptionId)?.option_text
            }</span></p>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-700">Yes</span>
                <span className="text-sm text-slate-600">{yesVotes} votes ({total > 0 ? ((yesVotes / total) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${total > 0 ? (yesVotes / total) * 100 : 0}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-700">No</span>
                <span className="text-sm text-slate-600">{noVotes} votes ({total > 0 ? ((noVotes / total) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${total > 0 ? (noVotes / total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            {pollOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  option.option_text.toLowerCase() === 'yes'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } disabled:opacity-50`}
              >
                {loading ? 'Voting...' : option.option_text}
              </button>
            ))}
          </div>
        )}
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    )
  }

  // Multiple choice polls
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-slate-900">Poll Results</h4>
      
      {hasVoted && (
        <p className="text-sm text-slate-600">You voted for: <span className="font-medium">{
          pollOptions.find(o => o.id === userVotedOptionId)?.option_text
        }</span></p>
      )}
      
      <div className="space-y-3">
        {pollOptions.map((option) => {
          const percentage = getPercentage(option.vote_count)
          const isUserChoice = userVotedOptionId === option.id
          
          return (
            <div key={option.id} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${isUserChoice ? 'font-medium text-teal-700' : 'text-slate-700'}`}>
                  {option.option_text} {isUserChoice && '✓'}
                </span>
                <span className="text-sm text-slate-600">
                  {option.vote_count} votes ({percentage.toFixed(0)}%)
                </span>
              </div>
              
              {hasVoted ? (
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isUserChoice ? 'bg-teal-500' : 'bg-slate-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              ) : (
                <button
                  onClick={() => handleVote(option.id)}
                  disabled={loading}
                  className="w-full text-left p-2 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors disabled:opacity-50"
                >
                  {option.option_text}
                </button>
              )}
            </div>
          )
        })}
      </div>
      
      {!hasVoted && (
        <p className="text-sm text-slate-500">Click an option to vote</p>
      )}
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
