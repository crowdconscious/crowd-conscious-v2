'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

function getStableAnonPresenceKey(): string {
  if (typeof window === 'undefined') return 'ssr-anon'
  const storageKey = 'cc_live_presence_key'
  let id = sessionStorage.getItem(storageKey)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(storageKey, id)
  }
  return id
}

export interface UsePresenceResult {
  viewerCount: number
  isConnected: boolean
  /** Show reconnect UI: browser offline or presence channel dropped after connecting */
  showConnectionWarning: boolean
  browserOffline: boolean
}

/**
 * Joins a Supabase Presence channel for the live event and reports viewer count.
 * Logged-in users use `userId` as the presence key; guests get a stable per-tab anon key.
 */
export function usePresence(eventId: string | null, userId: string | null): UsePresenceResult {
  const supabase = useMemo(() => createClient(), [])
  const presenceKey = useMemo(
    () => userId ?? `anon:${getStableAnonPresenceKey()}`,
    [userId]
  )
  const [viewerCount, setViewerCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [channelGen, setChannelGen] = useState(0)
  const [browserOnline, setBrowserOnline] = useState(true)
  const wasEverSubscribedRef = useRef(false)

  useEffect(() => {
    wasEverSubscribedRef.current = false
  }, [eventId])

  useEffect(() => {
    const sync = () => setBrowserOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEffect(() => {
    if (!eventId) {
      setViewerCount(0)
      setIsConnected(false)
      return
    }

    const channel = supabase.channel(`live:${eventId}`, {
      config: { presence: { key: presenceKey } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      setViewerCount(Object.keys(state).length)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        wasEverSubscribedRef.current = true
        setIsConnected(true)
        await channel.track({
          user_id: userId,
          joined_at: new Date().toISOString(),
        })
      } else if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        setIsConnected(false)
      }
    })

    return () => {
      setIsConnected(false)
      setViewerCount(0)
      void supabase.removeChannel(channel)
    }
  }, [eventId, presenceKey, supabase, userId, channelGen])

  useEffect(() => {
    if (!eventId || isConnected) return
    if (!wasEverSubscribedRef.current) return
    const t = setTimeout(() => setChannelGen((g) => g + 1), 2800)
    return () => clearTimeout(t)
  }, [eventId, isConnected, channelGen])

  const presenceLost = wasEverSubscribedRef.current && !isConnected
  const showConnectionWarning = !browserOnline || presenceLost
  const browserOffline = !browserOnline

  return { viewerCount, isConnected, showConnectionWarning, browserOffline }
}
