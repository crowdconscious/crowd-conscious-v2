'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

interface PollOption {
  id: string
  option_text: string
  vote_count: number
}

interface PublicPollFormProps {
  contentId: string
}

export default function PublicPollForm({ contentId }: PublicPollFormProps) {
  const [options, setOptions] = useState<PollOption[]>([])
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPollOptions()
  }, [contentId])

  const fetchPollOptions = async () => {
    await fetchPollOptionsWithExternalVotes()
  }

  const fetchPollOptionsWithExternalVotes = async () => {
    // Use RPC to get poll results with total votes (authenticated + external)
    const { data, error } = await supabase
      .rpc('get_poll_results', { content_uuid: contentId })

    if (error) {
      console.error('Error fetching poll results:', error)
      // Fallback to direct query if RPC fails
      const { data: fallbackData } = await supabase
        .from('poll_options')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: true })
      setOptions(fallbackData || [])
      return
    }

    // Map RPC results to expected format
    const mappedOptions = (data || []).map((opt: any) => ({
      id: opt.option_id,
      option_text: opt.option_text,
      vote_count: opt.vote_count || 0,
      created_at: opt.created_at
    }))

    setOptions(mappedOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedOption || !email || !name) {
      setMessage('Please fill in all fields')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Check if email has already voted
      const { data: existingResponse } = await supabase
        .from('external_responses')
        .select('id')
        .eq('content_id', contentId)
        .eq('response_type', 'poll_vote')
        .eq('respondent_email', email)
        .maybeSingle()

      if (existingResponse) {
        setMessage('This email has already voted on this poll.')
        setLoading(false)
        return
      }

      // Create external response record
      const { error: responseError } = await supabase
        .from('external_responses')
        .insert({
          content_id: contentId,
          response_type: 'poll_vote',
          response_data: {
            poll_option_id: selectedOption
          },
          respondent_email: email,
          respondent_name: name
        })

      if (responseError) {
        console.error('Error submitting poll response:', responseError)
        setMessage('Failed to submit your vote. Please try again.')
        setLoading(false)
        return
      }

      // Send confirmation email
      try {
        const selectedOptionData = options.find(opt => opt.id === selectedOption)
        await fetch('/api/external-response/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name,
            responseType: 'poll_vote',
            contentTitle: title,
            contentType: 'poll',
            pollOption: selectedOptionData?.option_text
          })
        })
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Don't fail the submission if email fails
      }

      setSubmitted(true)
      setMessage('Thank you for your vote! Your response has been recorded. Check your email for confirmation.')
      
      // Refresh options to show updated counts (with external votes)
      await fetchPollOptionsWithExternalVotes()
    } catch (error) {
      console.error('Submission error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <span className="text-4xl mb-4 block">🗳️</span>
          <h3 className="text-lg font-semibold text-green-800 mb-2">Vote Submitted!</h3>
          <p className="text-green-700 mb-4">{message}</p>
          
          {/* Show current results */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">Current Results:</h4>
            {options.map((option) => {
              const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0)
              const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0
              
              return (
                <div key={option.id} className="text-left">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      {option.option_text}
                    </span>
                    <span className="text-sm text-slate-500">
                      {option.vote_count} votes ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span>📊</span>
        Cast Your Vote
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Poll Options */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Choose your option:
          </label>
          {options.map((option) => (
            <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="pollOption"
                value={option.id}
                checked={selectedOption === option.id}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
              />
              <span className="text-slate-700">{option.option_text}</span>
              <span className="text-sm text-slate-500">({option.vote_count} votes)</span>
            </label>
          ))}
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('Thank you') 
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedOption || !email || !name}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Submitting Vote...' : 'Submit My Vote'}
        </button>
      </form>

      <div className="mt-4 text-xs text-slate-500">
        Your email will only be used to prevent duplicate voting and send you updates about this community if you choose to join.
      </div>
    </div>
  )
}
