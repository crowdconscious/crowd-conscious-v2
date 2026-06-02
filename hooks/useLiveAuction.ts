'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { LiveAuctionItemWithBids } from '@/lib/live/auction-types'

export function useLiveAuction(
  eventId: string | null,
  userId: string | null,
  anonymousParticipantId: string | null
) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<LiveAuctionItemWithBids[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchItems = useCallback(
    async (silent = false) => {
      if (!eventId) {
        setItems([])
        if (!silent) setIsLoading(false)
        return
      }
      if (!silent) {
        setIsLoading(true)
        setError(null)
      }
      try {
        const res = await fetch(`/api/live/auction/items?eventId=${encodeURIComponent(eventId)}`, {
          cache: 'no-store',
        })
        const json = (await res.json()) as {
          items?: LiveAuctionItemWithBids[]
          error?: string
        }
        if (!res.ok) throw new Error(json.error ?? 'Failed to load auction')
        setItems(json.items ?? [])
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load auction'))
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [eventId]
  )

  useEffect(() => {
    void fetchItems(false)
  }, [fetchItems, userId, anonymousParticipantId])

  useEffect(() => {
    if (!eventId) return

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        void fetchItems(true)
      }, 800)
    }

    const channel = supabase
      .channel(`live-auction-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_auction_items' },
        schedule
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_auction_votes' },
        schedule
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void supabase.removeChannel(channel)
    }
  }, [eventId, supabase, fetchItems])

  const activeItem = useMemo(
    () => items.find((i) => i.status === 'bidding') ?? null,
    [items]
  )

  return { items, activeItem, isLoading, error, refetch: fetchItems }
}
