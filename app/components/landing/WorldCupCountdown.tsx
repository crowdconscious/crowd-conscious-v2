'use client'

import { useEffect, useState } from 'react'

const WORLD_CUP_DATE = new Date('2026-06-11T12:00:00Z')

export function WorldCupCountdown() {
  const [diff, setDiff] = useState({ days: 0, hours: 0, minutes: 0 })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const ms = WORLD_CUP_DATE.getTime() - now.getTime()
      if (ms <= 0) {
        setDiff({ days: 0, hours: 0, minutes: 0 })
        return
      }
      const days = Math.floor(ms / (1000 * 60 * 60 * 24))
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
      setDiff({ days, hours, minutes })
    }
    update()
    const t = setInterval(update, 60_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8">
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-6 py-4 min-w-[100px] text-center">
        <p className="text-3xl md:text-4xl font-bold text-emerald-400">{diff.days}</p>
        <p className="text-sm text-slate-400">days</p>
      </div>
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-6 py-4 min-w-[100px] text-center">
        <p className="text-3xl md:text-4xl font-bold text-emerald-400">{diff.hours}</p>
        <p className="text-sm text-slate-400">hours</p>
      </div>
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-6 py-4 min-w-[100px] text-center">
        <p className="text-3xl md:text-4xl font-bold text-emerald-400">{diff.minutes}</p>
        <p className="text-sm text-slate-400">minutes</p>
      </div>
    </div>
  )
}
