'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  type: 'event' | 'deadline' | 'meeting'
  community_name: string
  community_id: string
  status?: 'registered' | 'not_registered' | 'deadline'
}

interface DashboardCalendarProps {
  userId: string
}

export default function DashboardCalendar({ userId }: DashboardCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  // supabase is already imported

  useEffect(() => {
    fetchCalendarEvents()
  }, [userId, currentDate])

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true)
      console.log('🗓️ Fetching calendar events for user:', userId)
      
      // Get start and end of current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      // Fetch events from communities user is a member of
      const { data: userCommunities, error: communitiesError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId)

      if (communitiesError) {
        console.error('❌ Error fetching user communities:', communitiesError)
      }

      console.log('👥 User communities:', userCommunities)

      // If user has no communities, still show public events
      const communityIds = userCommunities?.map(c => c.community_id) || []
      
      // Always try to fetch some events, even if user has no communities
      if (communityIds.length === 0) {
        console.log('📝 User has no communities, fetching all public events')
      }

      // Fetch events - more robust query
      let eventQuery = supabase
        .from('community_content')
        .select(`
          id,
          title,
          data,
          type,
          voting_deadline,
          community_id,
          communities:community_id (
            id,
            name
          )
        `)
        .in('type', ['event', 'poll', 'need'])

      // Filter by communities if user has any, otherwise show all
      if (communityIds.length > 0) {
        eventQuery = eventQuery.in('community_id', communityIds)
      }

      const { data: eventData, error: eventError } = await eventQuery

      if (eventError) {
        console.error('❌ Error fetching events:', eventError)
      }

      console.log('📅 Raw event data:', eventData)

      // Fetch user's event registrations
      const { data: registrations, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('content_id')
        .eq('user_id', userId)

      if (registrationsError) {
        console.error('❌ Error fetching registrations:', registrationsError)
      }

      console.log('📝 User registrations:', registrations)

      const registeredEventIds = new Set(registrations?.map(r => r.content_id) || [])

      // Process events
      const calendarEvents: CalendarEvent[] = []

      eventData?.forEach(item => {
        const itemData = item.data || {}
        console.log('🔍 Processing item:', item.title, 'Type:', item.type, 'Data:', itemData)
        
        if (item.type === 'event') {
          // More flexible date handling
          const eventDate = itemData.date || itemData.event_date || itemData.start_date
          if (eventDate) {
            calendarEvents.push({
              id: item.id,
              title: item.title,
              date: eventDate,
              time: itemData.time || itemData.start_time,
              type: 'event',
              community_name: (item.communities as any)?.name || 'Unknown Community',
              community_id: item.community_id,
              status: registeredEventIds.has(item.id) ? 'registered' : 'not_registered'
            })
          } else {
            console.log('⚠️ Event missing date:', item.title)
          }
        }

        // Add voting deadlines
        if (item.voting_deadline && ['poll', 'need'].includes(item.type)) {
          const deadlineDate = new Date(item.voting_deadline)
          if (deadlineDate >= startOfMonth && deadlineDate <= endOfMonth) {
            calendarEvents.push({
              id: `${item.id}-deadline`,
              title: `Voting: ${item.title}`,
              date: item.voting_deadline.split('T')[0],
              time: new Date(item.voting_deadline).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              type: 'deadline',
              community_name: (item.communities as any).name,
              community_id: (item.communities as any).id,
              status: 'deadline'
            })
          }
        }
      })

      console.log('✅ Processed calendar events:', calendarEvents.length, 'events')
      console.log('📊 Events by type:', {
        events: calendarEvents.filter(e => e.type === 'event').length,
        deadlines: calendarEvents.filter(e => e.type === 'deadline').length,
        registered: calendarEvents.filter(e => e.status === 'registered').length
      })

      setEvents(calendarEvents)
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error)
      setEvents([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return events.filter(event => event.date === dateString)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const today = new Date()
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const getEventTypeColor = (type: string, status?: string) => {
    if (type === 'event') {
      return status === 'registered' 
        ? 'bg-green-500 text-white' 
        : 'bg-blue-500 text-white'
    }
    if (type === 'deadline') {
      return 'bg-amber-500 text-white'
    }
    return 'bg-slate-500 text-white'
  }

  const getEventTypeIcon = (type: string, status?: string) => {
    if (type === 'event') {
      return status === 'registered' ? '✓' : '📅'
    }
    if (type === 'deadline') {
      return '⏰'
    }
    return '📋'
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-slate-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="h-20"></div>
          }

          const dayEvents = getEventsForDate(date)
          const isCurrentDay = isToday(date)

          return (
            <div
              key={date.toISOString()}
              className={`h-20 p-1 border rounded-lg cursor-pointer transition-colors ${
                isCurrentDay 
                  ? 'bg-teal-50 border-teal-200' 
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setSelectedDate(date)}
            >
              <div className={`text-sm font-medium mb-1 ${
                isCurrentDay ? 'text-teal-700' : 'text-slate-900'
              }`}>
                {date.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    className={`text-xs px-1 py-0.5 rounded truncate ${
                      getEventTypeColor(event.type, event.status)
                    }`}
                    title={`${event.title} - ${event.community_name}`}
                  >
                    <span className="mr-1">{getEventTypeIcon(event.type, event.status)}</span>
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-slate-500">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-slate-600">Registered Events</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-slate-600">Available Events</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span className="text-slate-600">Voting Deadlines</span>
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="font-medium text-slate-900 mb-3">
            Events for {selectedDate.toLocaleDateString()}
          </h4>
          {getEventsForDate(selectedDate).length === 0 ? (
            <p className="text-slate-600 text-sm">No events scheduled</p>
          ) : (
            <div className="space-y-2">
              {getEventsForDate(selectedDate).map(event => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <div className="font-medium text-slate-900">
                      <span className="mr-2">{getEventTypeIcon(event.type, event.status)}</span>
                      {event.title}
                    </div>
                    <div className="text-sm text-slate-600">
                      {event.community_name} • {event.time || 'All day'}
                    </div>
                  </div>
                  <a
                    href={`/communities/${event.community_id}`}
                    className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
