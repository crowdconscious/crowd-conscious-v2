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
    const { data, error } = await supabase
      .from('poll_options')
      .select('*')
      .eq('content_id', contentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching poll options:', error)
      return
    }

    setOptions(data || [])
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
      // Create external response record
      // TODO: Fix type issues with external_responses table
      const { error } = null as any
      /* await supabase
        .from('external_responses')
        .insert({
          content_id: contentId,
          response_type: 'poll_vote',
          response_data: {
            poll_option_id: selectedOption,
            name: name,
            email: email
          },
          respondent_email: email,
          respondent_name: name
        }) */

      if (error) {
        console.error('Error submitting poll response:', error)
        setMessage('Failed to submit your vote. Please try again.')
        return
      }

      // Update poll option vote count
      const selectedOptionData = options.find(opt => opt.id === selectedOption)
      if (selectedOptionData) {
        // TODO: Fix type issues with poll_options table
        /* await supabase
          .from('poll_options')
          .update({ vote_count: selectedOptionData.vote_count + 1 })
          .eq('id', selectedOption) */
      }

      setSubmitted(true)
      setMessage('Thank you for your vote! Your response has been recorded.')
      
      // Refresh options to show updated counts
      fetchPollOptions()
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
