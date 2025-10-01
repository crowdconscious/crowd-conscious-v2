'use client'

import { useState, useEffect } from 'react'
import { createClientAuth } from '@/lib/auth'

interface EventRegistration {
  id: string
  user_id: string
  status: string
}

interface UserRegistration {
  id: string
  status: string
}

interface EventRSVPProps {
  contentId: string
  maxParticipants: number | null
  eventRegistrations: EventRegistration[]
  userRegistration: UserRegistration[] | null
  eventDate: string | null
  location: string | null
  onUpdate: () => void
}

export default function EventRSVP({ 
  contentId, 
  maxParticipants, 
  eventRegistrations, 
  userRegistration,
  eventDate,
  location,
  onUpdate 
}: EventRSVPProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientAuth()

  const isRegistered = userRegistration && userRegistration.length > 0
  const registrationStatus = isRegistered ? userRegistration[0].status : null
  const activeRegistrations = eventRegistrations.filter(r => r.status === 'registered').length
  const isFull = maxParticipants && activeRegistrations >= maxParticipants
  const isEventPast = eventDate && new Date(eventDate) < new Date()

  // Set up real-time subscription for event registration updates
  useEffect(() => {
    const channel = supabase
      .channel(`event_registrations_${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations',
          filter: `content_id=eq.${contentId}`
        },
        (payload) => {
          console.log('📅 Real-time RSVP update:', payload)
          onUpdate() // Refresh event data
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [contentId, onUpdate])

  const handleRSVP = async (action: 'register' | 'cancel') => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to RSVP')
        setLoading(false)
        return
      }

      if (action === 'register') {
        if (isFull) {
          setError('This event is full')
          setLoading(false)
          return
        }

        const { error: rsvpError } = await (supabase as any)
          .from('event_registrations')
          .upsert({
            content_id: contentId,
            user_id: user.id,
            status: 'registered'
          }, {
            onConflict: 'user_id,content_id'
          })

        if (rsvpError) {
          setError(rsvpError.message)
        } else {
          onUpdate()
        }
      } else if (action === 'cancel') {
        const { error: cancelError } = await (supabase as any)
          .from('event_registrations')
          .update({ status: 'cancelled' })
          .eq('content_id', contentId)
          .eq('user_id', user.id)

        if (cancelError) {
          setError(cancelError.message)
        } else {
          onUpdate()
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4 bg-slate-50 rounded-lg p-4">
      <h4 className="font-medium text-slate-900">Event Details</h4>
      
      <div className="space-y-2 text-sm">
        {eventDate && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">📅</span>
            <span>{formatDate(eventDate)}</span>
          </div>
        )}
        
        {location && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">📍</span>
            <span>{location}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500">👥</span>
          <span>
            {activeRegistrations} registered
            {maxParticipants && ` / ${maxParticipants} max`}
          </span>
        </div>
      </div>

      {isEventPast ? (
        <div className="text-sm text-slate-500 font-medium">
          This event has already occurred
        </div>
      ) : (
        <div className="space-y-3">
          {isRegistered ? (
            <div className="space-y-2">
              <div className={`text-sm font-medium ${
                registrationStatus === 'registered' 
                  ? 'text-green-700' 
                  : registrationStatus === 'cancelled'
                  ? 'text-red-700'
                  : 'text-slate-700'
              }`}>
                Status: {registrationStatus === 'registered' ? 'You are registered ✓' : 
                        registrationStatus === 'cancelled' ? 'Registration cancelled' : 
                        registrationStatus}
              </div>
              
              {registrationStatus === 'registered' && (
                <button
                  onClick={() => handleRSVP('cancel')}
                  disabled={loading}
                  className="w-full py-2 px-4 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Cancelling...' : 'Cancel Registration'}
                </button>
              )}
              
              {registrationStatus === 'cancelled' && (
                <button
                  onClick={() => handleRSVP('register')}
                  disabled={loading || !!isFull}
                  className="w-full py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Registering...' : isFull ? 'Event Full' : 'Register Again'}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleRSVP('register')}
              disabled={loading || !!isFull}
              className="w-full py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registering...' : isFull ? 'Event Full' : 'Register for Event'}
            </button>
          )}
          
          {isFull && !isRegistered && (
            <p className="text-sm text-orange-600">
              This event is at capacity. You can still register to be added to the waitlist.
            </p>
          )}
        </div>
      )}
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
