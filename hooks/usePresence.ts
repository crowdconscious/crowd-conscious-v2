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
  showConnectionWarning: boolean
  browserOffline: boolean
}

/**
 * Presence for live events. Prefer `aliasSessionId` when the viewer joined with an alias
 * (matches httpOnly cc_session); otherwise falls back to a per-tab key.
 */
export function usePresence(
  eventId: string | null,
  userId: string | null,
  aliasSessionId?: string | null,
  aliasLabel?: string | null
): UsePresenceResult {
  const supabase = useMemo(() => createClient(), [])
  const presenceKey = useMemo(() => {
    if (userId) return userId
    if (aliasSessionId) return `session:${aliasSessionId}`
    return `anon:${getStableAnonPresenceKey()}`
  }, [userId, aliasSessionId])
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
        const presenceType = userId ? 'registered' : aliasSessionId ? 'alias' : 'viewer'
        await channel.track({
          user_id: userId,
          session_id: aliasSessionId ?? null,
          alias: aliasLabel ?? null,
          is_anonymous: userId == null,
          type: presenceType,
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
  }, [eventId, presenceKey, supabase, userId, aliasSessionId, aliasLabel, channelGen])

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
