'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export interface ViewerCountProps {
  count: number
  isConnected: boolean
  locale?: 'en' | 'es'
}

function useAnimatedInt(target: number, duration = 400) {
  const [v, setV] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const start = fromRef.current
    const end = target
    if (start === end) return
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setV(Math.round(start + (end - start) * eased))
      if (t < 1) requestAnimationFrame(tick)
      else fromRef.current = end
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return v
}

export function ViewerCount({ count, isConnected, locale = 'es' }: ViewerCountProps) {
  const display = useAnimatedInt(count, 400)
  const prev = useRef(count)
  const bump = count !== prev.current
  useEffect(() => {
    prev.current = count
  }, [count])

  const label =
    locale === 'es'
      ? `${display.toLocaleString('es-MX')} viendo`
      : `${display.toLocaleString('en-US')} watching`

  return (
    <motion.div
      animate={bump ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 0.28 }}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-slate-200"
    >
      {!isConnected ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          </span>
          <span className="text-amber-300/95">
            {locale === 'es' ? 'Reconectando…' : 'Reconnecting…'}
          </span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="font-medium tabular-nums text-white">{label}</span>
        </>
      )}
    </motion.div>
  )
}
