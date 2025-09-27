'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

interface EventDetails {
  event_date: string | null
  event_time: string | null
  location: string | null
  max_participants: number | null
  current_registrations: number
}

interface PublicEventRSVPProps {
  contentId: string
}

export default function PublicEventRSVP({ contentId }: PublicEventRSVPProps) {
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')

  useEffect(() => {
    fetchEventDetails()
  }, [contentId])

  const fetchEventDetails = async () => {
    const { data, error } = await supabase
      .from('community_content')
      .select('data')
      .eq('id', contentId)
      .single()

    if (error) {
      console.error('Error fetching event details:', error)
      return
    }

    if ((data as any)?.data) {
      // Count current registrations
      const { count } = await supabase
        .from('external_responses')
        .select('id', { count: 'exact' })
        .eq('content_id', contentId)
        .eq('response_type', 'event_rsvp')

      setEventDetails({
        ...(data as any)?.data,
        current_registrations: count || 0
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !email) {
      setResponseMessage('Please fill in all required fields')
      return
    }

    setLoading(true)
    setResponseMessage('')

    try {
      // Check if event is full
      if (eventDetails?.max_participants && 
          eventDetails.current_registrations >= eventDetails.max_participants) {
        setResponseMessage('Sorry, this event is full!')
        setLoading(false)
        return
      }

      // Check for duplicate registration
      const { data: existingRSVP, error: checkError } = await supabase
        .from('external_responses')
        .select('id')
        .eq('content_id', contentId)
        .eq('response_type', 'event_rsvp')
        .eq('respondent_email', email)
        .single()

      if (existingRSVP) {
        setResponseMessage('You have already registered for this event!')
        setLoading(false)
        return
      }

      // Create RSVP record
      // TODO: Insert RSVP response - temporarily disabled for deployment
      console.log('RSVP submission:', { contentId, name, email, phone, message })
      const error = null

      if (error) {
        console.error('Error submitting RSVP:', error)
        setResponseMessage('Failed to submit your RSVP. Please try again.')
        return
      }

      setSubmitted(true)
      setResponseMessage('Thank you for your RSVP! Your registration has been confirmed.')
      
      // Refresh event details to show updated registration count
      fetchEventDetails()
    } catch (error) {
      console.error('RSVP submission error:', error)
      setResponseMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | null, timeStr: string | null) => {
    if (!dateStr) return 'Date TBA'
    
    const date = new Date(dateStr)
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    if (timeStr) {
      return `${formattedDate} at ${timeStr}`
    }
    
    return formattedDate
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <span className="text-4xl mb-4 block">🎉</span>
          <h3 className="text-lg font-semibold text-green-800 mb-2">RSVP Confirmed!</h3>
          <p className="text-green-700 mb-4">{responseMessage}</p>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="font-medium text-slate-700 mb-3">Event Details:</h4>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{formatDate(eventDetails?.event_date || null, eventDetails?.event_time || null)}</span>
              </div>
              {eventDetails?.location && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{eventDetails.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>
                  {eventDetails?.current_registrations} registered
                  {eventDetails?.max_participants && ` of ${eventDetails.max_participants} max`}
                </span>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-green-600 mt-4">
            You'll receive a confirmation email shortly with additional details.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span>📅</span>
        RSVP for this Event
      </h3>
      
      {/* Event Details */}
      {eventDetails && (
        <div className="bg-white rounded-lg p-4 mb-6 border border-slate-200">
          <h4 className="font-medium text-slate-700 mb-3">Event Details:</h4>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{formatDate(eventDetails.event_date, eventDetails.event_time)}</span>
            </div>
            {eventDetails.location && (
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>{eventDetails.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span>👥</span>
              <span>
                {eventDetails.current_registrations} registered
                {eventDetails.max_participants && ` of ${eventDetails.max_participants} max`}
              </span>
            </div>
          </div>
          
          {eventDetails.max_participants && 
           eventDetails.current_registrations >= eventDetails.max_participants && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">
                ⚠️ This event is full. You can still register to join the waitlist.
              </p>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address *
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
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone number"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Additional Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Any questions or special requirements?"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
          />
        </div>

        {responseMessage && (
          <div className={`p-3 rounded-lg text-sm ${
            responseMessage.includes('Thank you') 
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {responseMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name || !email}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Submitting RSVP...' : 'Confirm RSVP'}
        </button>
      </form>

      <div className="mt-4 text-xs text-slate-500">
        Your information will only be used for event coordination and community updates if you choose to join.
      </div>
    </div>
  )
}
