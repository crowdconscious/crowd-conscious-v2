'use client'

import { useEffect, useState } from 'react'
import { WORLD_CUP_KICKOFF } from '@/lib/world-cup-kickoff'

type Diff = { days: number; hours: number; minutes: number }

function computeDiff(): Diff {
  const ms = WORLD_CUP_KICKOFF.getTime() - Date.now()
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0 }
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return { days, hours, minutes }
}

export function WorldCupCountdown({ locale = 'en' }: { locale?: 'en' | 'es' }) {
  // Initial compute runs on both server and first client render. The numbers
  // will differ by a few ms between SSR and hydration, which is fine — we
  // suppressHydrationWarning on the cells and update to live values in
  // useEffect. Avoid rendering em-dashes: they're a strictly worse UX than a
  // slightly stale initial value, which gets replaced within one tick.
  const [diff, setDiff] = useState<Diff>(() => computeDiff())

  useEffect(() => {
    const tick = () => setDiff(computeDiff())
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const dayLabel = locale === 'es' ? 'días' : 'days'
  const hourLabel = locale === 'es' ? 'horas' : 'hours'
  const minLabel = locale === 'es' ? 'minutos' : 'minutes'

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8">
      <div className="min-w-[100px] rounded-xl border border-cc-border bg-gray-800/80 px-6 py-4 text-center">
        <p
          className="text-3xl font-bold text-emerald-400 md:text-4xl"
          suppressHydrationWarning
        >
          {diff.days}
        </p>
        <p className="text-sm text-slate-400">{dayLabel}</p>
      </div>
      <div className="min-w-[100px] rounded-xl border border-cc-border bg-gray-800/80 px-6 py-4 text-center">
        <p
          className="text-3xl font-bold text-emerald-400 md:text-4xl"
          suppressHydrationWarning
        >
          {diff.hours}
        </p>
        <p className="text-sm text-slate-400">{hourLabel}</p>
      </div>
      <div className="min-w-[100px] rounded-xl border border-cc-border bg-gray-800/80 px-6 py-4 text-center">
        <p
          className="text-3xl font-bold text-emerald-400 md:text-4xl"
          suppressHydrationWarning
        >
          {diff.minutes}
        </p>
        <p className="text-sm text-slate-400">{minLabel}</p>
      </div>
    </div>
  )
}
