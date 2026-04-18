'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Database } from '@/types/database'

type MarketRow = Database['public']['Tables']['prediction_markets']['Row'] & {
  archived_at?: string | null
}
export type MarketOutcomeRow = Database['public']['Tables']['market_outcomes']['Row']

export type MarketWithOutcomes = MarketRow & { outcomes: MarketOutcomeRow[] }

export interface UseLiveMarketsResult {
  /** All markets for this live event (any status). */
  allMarkets: MarketWithOutcomes[]
  activeMarkets: MarketWithOutcomes[]
  resolvedMarkets: MarketWithOutcomes[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

function isActiveStatus(status: string): boolean {
  return status === 'active' || status === 'trading'
}

export function useLiveMarkets(eventId: string | null): UseLiveMarketsResult {
  const supabase = useMemo(() => createClient(), [])
  const [marketsById, setMarketsById] = useState<Record<string, MarketWithOutcomes>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const marketIdsRef = useRef<Set<string>>(new Set())

  const mergeOutcomes = useCallback(
    (marketId: string, outcomes: MarketOutcomeRow[]) => {
      setMarketsById((prev) => {
        const cur = prev[marketId]
        if (!cur) return prev
        return {
          ...prev,
          [marketId]: { ...cur, outcomes },
        }
      })
    },
    []
  )

  const loadOutcomesForMarket = useCallback(
    async (marketId: string) => {
      const { data, error: oErr } = await supabase
        .from('market_outcomes')
        .select('*')
        .eq('market_id', marketId)
        .order('sort_order', { ascending: true })

      if (oErr) {
        setError(new Error(oErr.message))
        return
      }
      mergeOutcomes(marketId, (data ?? []) as MarketOutcomeRow[])
    },
    [supabase, mergeOutcomes]
  )

  const upsertMarket = useCallback(
    (row: MarketRow) => {
      setMarketsById((prev) => {
        const existing = prev[row.id]
        return {
          ...prev,
          [row.id]: {
            ...row,
            outcomes: existing?.outcomes ?? [],
          },
        }
      })
    },
    []
  )

  const removeMarket = useCallback((id: string) => {
    setMarketsById((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const initialFetch = useCallback(async () => {
    if (!eventId) {
      setMarketsById({})
      marketIdsRef.current = new Set()
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    /**
     * Include archived markets so completed events still show their resolved
     * markets history. `activeMarkets` below already filters by status so
     * archived rows won't leak into the live voting panel.
     */
    const { data: rows, error: mErr } = await supabase
      .from('prediction_markets')
      .select('*')
      .eq('live_event_id', eventId)
      .order('created_at', { ascending: false })

    if (mErr) {
      setError(new Error(mErr.message))
      setMarketsById({})
      marketIdsRef.current = new Set()
      setIsLoading(false)
      return
    }

    const list = (rows ?? []) as MarketRow[]
    const ids = list.map((m) => m.id)
    marketIdsRef.current = new Set(ids)

    if (ids.length === 0) {
      setMarketsById({})
      setIsLoading(false)
      return
    }

    const { data: allOutcomes, error: oErr } = await supabase
      .from('market_outcomes')
      .select('*')
      .in('market_id', ids)
      .order('sort_order', { ascending: true })

    if (oErr) {
      setError(new Error(oErr.message))
      setIsLoading(false)
      return
    }

    const byMarket: Record<string, MarketOutcomeRow[]> = {}
    for (const o of (allOutcomes ?? []) as MarketOutcomeRow[]) {
      if (!byMarket[o.market_id]) byMarket[o.market_id] = []
      byMarket[o.market_id].push(o)
    }

    const next: Record<string, MarketWithOutcomes> = {}
    for (const m of list) {
      next[m.id] = { ...m, outcomes: byMarket[m.id] ?? [] }
    }
    setMarketsById(next)
    setIsLoading(false)
  }, [eventId, supabase])

  useEffect(() => {
    void initialFetch()
  }, [initialFetch])

  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`live-markets-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prediction_markets',
          filter: `live_event_id=eq.${eventId}`,
        },
        async (payload) => {
          const row = payload.new as MarketRow
          upsertMarket(row)
          marketIdsRef.current.add(row.id)
          await loadOutcomesForMarket(row.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prediction_markets',
          filter: `live_event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as MarketRow
          if (row.live_event_id !== eventId) {
            removeMarket(row.id)
            marketIdsRef.current.delete(row.id)
            return
          }
          upsertMarket(row)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'prediction_markets',
        },
        (payload) => {
          const oldRow = payload.old as { id?: string; live_event_id?: string | null }
          if (!oldRow.id || !marketIdsRef.current.has(oldRow.id)) return
          if (oldRow.live_event_id != null && oldRow.live_event_id !== eventId) return
          removeMarket(oldRow.id)
          marketIdsRef.current.delete(oldRow.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'market_outcomes',
        },
        (payload) => {
          const row = payload.new as MarketOutcomeRow
          if (!marketIdsRef.current.has(row.market_id)) return
          setMarketsById((prev) => {
            const m = prev[row.market_id]
            if (!m) return prev
            const idx = m.outcomes.findIndex((o) => o.id === row.id)
            const nextOutcomes =
              idx >= 0
                ? m.outcomes.map((o) => (o.id === row.id ? row : o))
                : [...m.outcomes, row]
            return {
              ...prev,
              [row.market_id]: { ...m, outcomes: nextOutcomes },
            }
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, supabase, upsertMarket, removeMarket, loadOutcomesForMarket])

  const list = useMemo(() => Object.values(marketsById), [marketsById])

  const activeMarkets = useMemo(
    () => list.filter((m) => isActiveStatus(m.status) && !m.archived_at),
    [list]
  )
  const resolvedMarkets = useMemo(
    () => list.filter((m) => m.status === 'resolved'),
    [list]
  )

  return { allMarkets: list, activeMarkets, resolvedMarkets, isLoading, error, refetch: initialFetch }
}
