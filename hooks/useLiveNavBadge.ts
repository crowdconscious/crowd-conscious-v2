'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Polls public live events list so nav can show a "live now" indicator.
 */
export function useLiveNavBadge(pollMs = 60000) {
  const [liveCount, setLiveCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/live/events?status=live', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as { events?: unknown[] }
      const n = Array.isArray(json.events) ? json.events.length : 0
      setLiveCount(n)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), pollMs)
    return () => clearInterval(id)
  }, [refresh, pollMs])

  return { liveCount, refresh }
}
