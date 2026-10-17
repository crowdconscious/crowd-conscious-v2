'use client'

/**
 * Client gate for Contraste IA on an OPEN Pulse. The server never ships the
 * prediction to a viewer who has not voted; it only sends `teaser`. After a
 * vote, this fetches the payload from /api/pulses/[id]/contraste-ia, which
 * re-checks the vote server-side (session user or guest id).
 */
import { useEffect, useState } from 'react'
import ContrasteIAChart from './ContrasteIAChart'
import type { ContrasteData } from '@/lib/contraste-ia/server'
import { GUEST_ID_KEY, getVotedGuestIdForMarket } from '@/lib/guest-vote-storage'
import { CONTRASTE_TEASER_EN, CONTRASTE_TEASER_ES } from '@/lib/contraste-ia/visibility'

export default function ContrasteIAGate({
  marketId,
  initial,
  teaser,
  hasVoted,
  locale,
}: {
  marketId: string
  initial: ContrasteData | null
  teaser: boolean
  hasVoted: boolean
  locale: 'es' | 'en'
}) {
  const [data, setData] = useState<ContrasteData | null>(initial)
  useEffect(() => {
    if (data || !teaser || !hasVoted) return
    let guest: string | null = null
    try {
      guest = getVotedGuestIdForMarket(marketId) ?? localStorage.getItem(GUEST_ID_KEY)
    } catch {}
    const q = guest ? `?guest_id=${encodeURIComponent(guest)}` : ''
    fetch(`/api/pulses/${marketId}/contraste-ia${q}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.data && setData(j.data))
      .catch(() => {})
  }, [data, teaser, hasVoted, marketId])

  if (data) return <ContrasteIAChart data={data} />
  if (!teaser) return null
  return (
    <section className="pulse-section mt-6 rounded-xl border border-violet-400/20 bg-violet-400/[0.05] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">Contraste IA</p>
      <p className="mt-1 text-sm text-slate-100">{locale === 'es' ? CONTRASTE_TEASER_ES : CONTRASTE_TEASER_EN}</p>
    </section>
  )
}
