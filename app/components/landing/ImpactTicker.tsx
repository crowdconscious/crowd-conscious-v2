'use client'

import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

function useCountUp(target: number, durationMs: number, enabled: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!enabled || target <= 0) {
      setValue(target)
      return
    }
    setValue(0)
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) * (1 - t)
      setValue(Math.round(eased * target))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, enabled])
  return value
}

function formatMoney(n: number, locale: string): string {
  if (locale === 'es') {
    return `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
  }
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function ImpactTicker({
  totalVotes,
  fundTotal,
  activeCauseName,
}: {
  totalVotes: number
  fundTotal: number
  activeCauseName?: string | null
}) {
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const fundRounded = Math.round(fundTotal)
  const hasVotes = totalVotes > 0
  const hasFund = fundRounded > 0
  const displayVotes = useCountUp(totalVotes, 1500, hasVotes)
  const displayFund = useCountUp(fundRounded, 1500, hasFund)

  if (!hasVotes && !hasFund) {
    return (
      <div className="border-b border-cc-border/50 bg-cc-card/60 px-4 py-2">
        <p className="text-center text-xs text-gray-400 md:text-sm">
          {locale === 'es'
            ? 'Sé el primero en opinar — cada voto cuenta'
            : 'Be the first to share your opinion — every vote counts'}
        </p>
      </div>
    )
  }

  const cause = activeCauseName?.trim() || (locale === 'es' ? 'causas activas' : 'active causes')

  if (hasVotes && !hasFund) {
    return (
      <div className="border-b border-cc-border/50 bg-gray-800/30 px-4 py-2">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-gray-400 md:text-sm">
          <Globe className="h-4 w-4 shrink-0 text-emerald-500/80" aria-hidden />
          <span>
            {locale === 'es' ? (
              <>
                <span className="font-medium text-gray-200">{displayVotes.toLocaleString('es-MX')}</span> opiniones
                {' generando impacto para '}
                <span className="text-gray-300">{cause}</span>
              </>
            ) : (
              <>
                <span className="font-medium text-gray-200">{displayVotes.toLocaleString('en-US')}</span> opinions
                {' driving impact for '}
                <span className="text-gray-300">{cause}</span>
              </>
            )}
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="border-b border-cc-border/50 bg-gray-800/30 px-4 py-2">
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-gray-400 md:text-sm">
        <Globe className="h-4 w-4 shrink-0 text-emerald-500/80" aria-hidden />
        <span>
          {locale === 'es' ? (
            <>
              <span className="font-medium text-gray-200">{displayVotes.toLocaleString('es-MX')}</span> opiniones
              {' → '}
              <span className="font-semibold text-emerald-400">{formatMoney(displayFund, locale)}</span>
              {' para '}
              <span className="text-gray-300">{cause}</span>
            </>
          ) : (
            <>
              <span className="font-medium text-gray-200">{displayVotes.toLocaleString('en-US')}</span> opinions →{' '}
              <span className="font-semibold text-emerald-400">{formatMoney(displayFund, locale)}</span>
              {' for '}
              <span className="text-gray-300">{cause}</span>
            </>
          )}
        </span>
      </p>
    </div>
  )
}
