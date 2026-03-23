'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { getPendingVote, clearPendingVote, clearGuestMarketKeys } from '@/lib/guest-vote-storage'

/**
 * After signup/login: claim guest market_votes row (re-attribute user_id + award XP).
 */
export function PendingVoteSubmitter() {
  const done = useRef(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (done.current) return

    const run = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) return

      const pending = getPendingVote()
      if (!pending?.marketId) return
      if (!pending.guestId) {
        clearPendingVote()
        done.current = true
        return
      }

      done.current = true

      try {
        const res = await fetch('/api/votes/claim-guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guest_id: pending.guestId,
            market_id: pending.marketId,
          }),
        })
        const data = await res.json()
        if (res.ok && data.success !== false) {
          clearPendingVote()
          clearGuestMarketKeys(pending.marketId)
          const xp = typeof data.xp_earned === 'number' ? data.xp_earned : 0
          setToast(
            xp > 0
              ? `Tu predicción anterior ya tiene XP — ¡bienvenido! +${xp} XP`
              : 'Tu predicción anterior ya tiene XP — ¡bienvenido!'
          )
          window.setTimeout(() => setToast(null), 6000)
        } else {
          done.current = false
          console.warn('[PendingVoteSubmitter]', data.error || res.status)
        }
      } catch (e) {
        done.current = false
        console.error('[PendingVoteSubmitter]', e)
      }
    }

    run()
  }, [])

  if (!toast) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-lg max-w-md text-center"
      role="status"
    >
      {toast}
    </div>
  )
}
