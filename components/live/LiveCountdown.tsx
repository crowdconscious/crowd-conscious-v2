'use client'

import { useEffect, useState } from 'react'

function formatRemaining(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return '…'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function LiveCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(() => formatRemaining(endsAt))

  useEffect(() => {
    const update = () => setRemaining(formatRemaining(endsAt))
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [endsAt])

  return <span className="font-medium text-emerald-400 tabular-nums">{remaining}</span>
}
