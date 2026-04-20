'use client'

/**
 * Pure presentational preview of how a sponsor's draft Pulse will look in the
 * public `/pulse` listing. No fetching, no state — strictly props in → JSX out
 * so the create-Pulse modal can render it client-side before the market exists
 * in the database.
 *
 * Styling tracks `components/pulse/PulseListingView.tsx` card markup so the
 * founder sees exactly what their audience will see.
 */

import { BarChart3 } from 'lucide-react'
import type { Language } from '@/contexts/LanguageContext'

type Props = {
  title: string
  coverImageUrl: string | null
  sponsorName: string
  sponsorLogoUrl: string | null
  options: string[]
  resolutionDate: string
  language: Language
}

function formatCloseDate(iso: string, language: Language): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function PulsePreviewCard({
  title,
  coverImageUrl,
  sponsorName,
  sponsorLogoUrl,
  options,
  resolutionDate,
  language,
}: Props) {
  const trimmedTitle = title.trim() || (language === 'es' ? 'Tu pregunta aquí' : 'Your question here')
  const cleanOptions = options.map((o) => o.trim()).filter(Boolean)
  const byLine = sponsorName.trim()
    ? `${language === 'es' ? 'Por' : 'By'} ${sponsorName.trim()}`
    : null

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029]">
      {coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImageUrl} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-amber-900/20 to-[#1a2029]">
          <BarChart3 className="h-12 w-12 text-emerald-500/35" aria-hidden />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          {sponsorLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsorLogoUrl}
              alt=""
              className="h-6 w-auto max-w-[72px] rounded object-contain"
            />
          ) : null}
          {byLine ? (
            <span className="text-[10px] uppercase tracking-wide text-slate-500">{byLine}</span>
          ) : null}
        </div>
        <h3 className="text-sm font-bold leading-snug text-white">{trimmedTitle}</h3>
        {cleanOptions.length > 0 ? (
          <ul className="space-y-1 text-xs text-slate-400">
            {cleanOptions.slice(0, 5).map((opt, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                {opt}
              </li>
            ))}
            {cleanOptions.length > 5 ? (
              <li className="text-[11px] text-slate-500">
                +{cleanOptions.length - 5} {language === 'es' ? 'más' : 'more'}
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 italic">
            {language === 'es' ? 'Agrega opciones para tus votantes.' : 'Add options for voters.'}
          </p>
        )}
        <p className="text-xs text-slate-500">
          {language === 'es' ? 'Cierra el' : 'Closes'} {formatCloseDate(resolutionDate, language)}
        </p>
        <span className="inline-block text-xs font-medium text-emerald-400">
          {language === 'es' ? 'Ver resultados en vivo →' : 'View live results →'}
        </span>
      </div>
    </div>
  )
}

export default PulsePreviewCard
