'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Database } from '@/types/database'

type LiveEventRow = Database['public']['Tables']['live_events']['Row']

export interface UseLiveEventResult {
  event: LiveEventRow | null
  isLive: boolean
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Loads a Conscious Live event row and subscribes to Realtime updates for that row.
 */
export function useLiveEvent(eventId: string | null): UseLiveEventResult {
  const supabase = useMemo(() => createClient(), [])
  const [event, setEvent] = useState<LiveEventRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvent = useCallback(async () => {
    if (!eventId) {
      setEvent(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('live_events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()

    if (qErr) {
      setError(new Error(qErr.message))
      setEvent(null)
    } else {
      setEvent(data)
    }
    setIsLoading(false)
  }, [eventId, supabase])

  useEffect(() => {
    void fetchEvent()
  }, [fetchEvent])

  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`live-event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setEvent((prev) => ({ ...(prev ?? ({} as LiveEventRow)), ...(payload.new as LiveEventRow) }))
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, supabase])

  const isLive = event?.status === 'live'

  return { event, isLive, isLoading, error, refetch: fetchEvent }
}
