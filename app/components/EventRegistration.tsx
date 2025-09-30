'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface EventRegistrationProps {
  eventId: string
  eventData: {
    title: string
    date?: string
    time?: string
    location?: string
    max_attendees?: number
    registration_deadline?: string
  }
  onRegistrationChange?: () => void
}

export default function EventRegistration({ 
  eventId, 
  eventData, 
  onRegistrationChange 
}: EventRegistrationProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [registrationCount, setRegistrationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [attendeeInfo, setAttendeeInfo] = useState({
    dietary_restrictions: '',
    emergency_contact: '',
    notes: ''
  })

  // supabase is already imported

  useEffect(() => {
    checkRegistrationStatus()
    getCurrentUser()
  }, [eventId])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const checkRegistrationStatus = async () => {
    try {
      setLoading(true)
      
      // Check if user is registered
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: registration } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('content_id', eventId)
          .eq('user_id', user.id)
          .single()

        setIsRegistered(!!registration)
      }

      // Get total registration count
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', eventId)

      setRegistrationCount(count || 0)
    } catch (error) {
      console.error('Error checking registration status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendeeInfo: attendeeInfo
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsRegistered(true)
        setRegistrationCount(prev => prev + 1)
        setShowForm(false)
        onRegistrationChange?.()
        alert('Successfully registered for the event! Check your email for confirmation.')
      } else {
        alert(data.error || 'Failed to register for event')
      }
    } catch (error) {
      console.error('Error registering for event:', error)
      alert('Failed to register for event')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnregister = async () => {
    if (!confirm('Are you sure you want to cancel your registration?')) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        setIsRegistered(false)
        setRegistrationCount(prev => prev - 1)
        onRegistrationChange?.()
        alert('Registration canceled successfully')
      } else {
        alert(data.error || 'Failed to cancel registration')
      }
    } catch (error) {
      console.error('Error canceling registration:', error)
      alert('Failed to cancel registration')
    } finally {
      setSubmitting(false)
    }
  }

  const isEventFull = eventData.max_attendees && registrationCount >= eventData.max_attendees
  const isRegistrationClosed = eventData.registration_deadline && 
    new Date() > new Date(eventData.registration_deadline)
  const isEventPast = eventData.date && new Date() > new Date(eventData.date)

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Event Registration</h3>
        <div className="text-sm text-slate-600">
          {registrationCount} registered
          {eventData.max_attendees && ` / ${eventData.max_attendees} max`}
        </div>
      </div>

      {/* Registration Status */}
      {isEventPast ? (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 text-center">
          <span className="text-slate-600">This event has ended</span>
        </div>
      ) : isRegistrationClosed ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <span className="text-amber-700">Registration is closed</span>
        </div>
      ) : isEventFull ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <span className="text-red-700">Event is at full capacity</span>
        </div>
      ) : !user ? (
        <div className="text-center">
          <p className="text-slate-600 mb-4">Sign in to register for this event</p>
          <a
            href="/login"
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Sign In to Register
          </a>
        </div>
      ) : isRegistered ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-700 font-medium">You're registered for this event!</span>
            </div>
          </div>
          <button
            onClick={handleUnregister}
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {submitting ? 'Canceling...' : 'Cancel Registration'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Register for Event
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dietary Restrictions (Optional)
                </label>
                <input
                  type="text"
                  value={attendeeInfo.dietary_restrictions}
                  onChange={(e) => setAttendeeInfo(prev => ({
                    ...prev,
                    dietary_restrictions: e.target.value
                  }))}
                  placeholder="e.g., Vegetarian, Gluten-free, None"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Emergency Contact (Optional)
                </label>
                <input
                  type="text"
                  value={attendeeInfo.emergency_contact}
                  onChange={(e) => setAttendeeInfo(prev => ({
                    ...prev,
                    emergency_contact: e.target.value
                  }))}
                  placeholder="Name and phone number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={attendeeInfo.notes}
                  onChange={(e) => setAttendeeInfo(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  placeholder="Any questions or special requirements?"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  disabled={submitting}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {submitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Registration Deadline Warning */}
      {eventData.registration_deadline && !isRegistrationClosed && (
        <div className="mt-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Registration closes on {new Date(eventData.registration_deadline).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
