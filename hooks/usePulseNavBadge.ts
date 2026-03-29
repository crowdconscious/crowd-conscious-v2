'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Polls open Pulse markets so nav can show Pulse only when ≥1 is live.
 */
export function usePulseNavBadge(pollMs = 60000) {
  const [pulseCount, setPulseCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/pulse/active-count', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as { count?: number }
      setPulseCount(typeof json.count === 'number' ? json.count : 0)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), pollMs)
    return () => clearInterval(id)
  }, [refresh, pollMs])

  return { pulseCount, refresh }
}
