'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ContentData {
  id: string
  type: 'poll' | 'event' | 'need'
  title: string
  description: string | null
  image_url: string | null
  community: {
    name: string
    id: string
    logo_url?: string | null
  }
  data?: any
}

interface ExternalInteractionFormProps {
  content: ContentData
}

export default function ExternalInteractionForm({ content }: ExternalInteractionFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    response: '',
    pollOption: '',
    attendeeCount: 1,
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission - in real app this would go to an API endpoint
    // that stores external responses and potentially sends email notifications
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      setIsSubmitted(true)
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Thank you for your response!
        </h2>
        <p className="text-slate-600 mb-8 max-w-lg mx-auto">
          Your {content.type === 'poll' ? 'vote' : content.type === 'event' ? 'RSVP' : 'interest'} has been recorded. 
          The community organizers will be notified.
        </p>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Want to stay involved?
          </h3>
          <p className="text-slate-600 mb-6">
            Join {content.community.name} to participate in community decisions and get updates on future activities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/communities/${content.community.id}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <span>🏠</span>
              Join Community
            </Link>
            
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
            >
              <span>✨</span>
              Create Account
            </Link>
          </div>
        </div>
        
        <Link
          href={`/share/${content.type}/${content.id}`}
          className="text-slate-500 hover:text-slate-700 text-sm font-medium"
        >
          ← Back to content
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Content Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          {content.community.logo_url ? (
            <img
              src={content.community.logo_url}
              alt={`${content.community.name} logo`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {content.community.name[0].toUpperCase()}
            </div>
          )}
          <span className="text-sm text-slate-600">{content.community.name}</span>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          {content.title}
        </h1>
        
        {content.description && (
          <p className="text-slate-600 max-w-2xl mx-auto mb-6">
            {content.description}
          </p>
        )}
        
        {content.image_url && (
          <img
            src={content.image_url}
            alt={content.title}
            className="w-full max-w-lg mx-auto rounded-xl shadow-lg mb-6"
          />
        )}
      </div>

      {/* Interaction Form */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* Content-specific fields */}
          {content.type === 'poll' && content.data?.poll_options && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Select your choice *
              </label>
              <div className="space-y-2">
                {content.data.poll_options.map((option: string, index: number) => (
                  <label key={index} className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="radio"
                      name="pollOption"
                      value={option}
                      required
                      onChange={(e) => setFormData({ ...formData, pollOption: e.target.value })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {content.type === 'event' && (
            <div>
              <label htmlFor="attendeeCount" className="block text-sm font-medium text-slate-700 mb-2">
                Number of Attendees
              </label>
              <select
                id="attendeeCount"
                value={formData.attendeeCount}
                onChange={(e) => setFormData({ ...formData, attendeeCount: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'person' : 'people'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
              {content.type === 'need' ? 'How would you like to help?' : 'Additional comments'} 
              {content.type === 'need' ? ' *' : ' (optional)'}
            </label>
            <textarea
              id="message"
              rows={4}
              required={content.type === 'need'}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors resize-none"
              placeholder={
                content.type === 'need' 
                  ? 'Describe how you can contribute to this need...'
                  : 'Any additional thoughts or questions...'
              }
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:from-neutral-400 disabled:to-neutral-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </div>
            ) : (
              <>
                {content.type === 'poll' && '🗳️ Submit Vote'}
                {content.type === 'event' && '✋ RSVP to Event'}
                {content.type === 'need' && '💡 Express Interest'}
              </>
            )}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
          <p className="text-xs text-neutral-500 mb-3">
            Your information will be shared with the community organizers. 
            By submitting, you agree to be contacted about this {content.type}.
          </p>
          
          <Link
            href={`/share/${content.type}/${content.id}`}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium"
          >
            ← Just view content
          </Link>
        </div>
      </div>
    </div>
  )
}
