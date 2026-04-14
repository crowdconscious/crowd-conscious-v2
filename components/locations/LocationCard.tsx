'use client'

import Link from 'next/link'
import { MapPin, Instagram, Gift, Clock } from 'lucide-react'
import type { Database, Json } from '@/types/database'
import { locationCategoryLabel } from '@/lib/locations/categories'
import { LocationCoverImage, LocationLogoImage } from '@/components/locations/LocationRemoteImage'
import { parseMetadataValues } from '@/lib/locations/conscious-values'
import { ValueBadgeRow } from '@/components/locations/ValueBadge'

export type LocationCardRow = {
  id: string
  name: string
  slug: string
  category: Database['public']['Tables']['conscious_locations']['Row']['category']
  city: string
  neighborhood: string | null
  why_conscious: string | null
  why_conscious_en: string | null
  user_benefits: string | null
  user_benefits_en: string | null
  cover_image_url: string | null
  logo_url: string | null
  instagram_handle: string | null
  conscious_score: number | null
  total_votes: number
  certified_at: string | null
  metadata?: Json | null
}

function scoreBadgeClass(score: number | null): string {
  if (score == null) return 'bg-slate-600'
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 6) return 'bg-amber-500'
  return 'bg-slate-500'
}

function formatMonthYear(iso: string | null, locale: 'es' | 'en'): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { month: 'long', year: 'numeric' })
}

export function LocationCard({
  location,
  locale,
  linkPrefix = '/locations',
}: {
  location: LocationCardRow
  locale: 'es' | 'en'
  linkPrefix?: string
}) {
  const why =
    locale === 'es'
      ? location.why_conscious || location.why_conscious_en
      : location.why_conscious_en || location.why_conscious
  const benefits =
    locale === 'es'
      ? location.user_benefits || location.user_benefits_en
      : location.user_benefits_en || location.user_benefits
  const catLabel = locationCategoryLabel(location.category, locale)
  const neighborhood = location.neighborhood
  const placeLine = [neighborhood, location.city].filter(Boolean).join(', ')
  const score = location.conscious_score
  const votes = location.total_votes ?? 0
  const needed = Math.max(0, 10 - votes)
  const ig = location.instagram_handle?.replace(/^@/, '') ?? ''
  const valueKeys = parseMetadataValues(location.metadata)

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] shadow-lg">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0f1419]">
        <LocationCoverImage
          url={location.cover_image_url}
          alt=""
          className="absolute inset-0 h-full w-full rounded-t-xl object-cover"
        />
        <div
          className={`absolute right-3 top-3 flex min-w-[3.5rem] flex-col items-center rounded-lg px-2 py-1 text-white shadow-md ${scoreBadgeClass(score)}`}
        >
          {score != null ? (
            <>
              <span className="text-lg font-bold leading-tight">{score.toFixed(1)}</span>
              <span className="text-[10px] font-medium opacity-90">/10</span>
            </>
          ) : (
            <span className="text-xs font-semibold">—</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#0f1419]">
            <LocationLogoImage
              url={location.logo_url}
              alt=""
              className="absolute inset-0 h-full w-full object-contain p-1"
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-white">{location.name}</h3>
            <p className="text-sm text-slate-400">
              {neighborhood ? `${neighborhood} · ` : ''}
              {catLabel}
            </p>
          </div>
        </div>

        {why ? <p className="text-sm leading-relaxed text-slate-300 line-clamp-3">{why}</p> : null}
        {valueKeys.length > 0 ? <ValueBadgeRow values={valueKeys} locale={locale} size="xs" /> : null}

        {benefits ? (
          <p className="flex items-start gap-2 text-sm text-emerald-400/95">
            <Gift className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{benefits}</span>
          </p>
        ) : null}

        {placeLine ? (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="h-4 w-4 shrink-0" />
            {placeLine}
          </p>
        ) : null}

        {ig ? (
          <a
            href={`https://instagram.com/${ig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
          >
            <Instagram className="h-4 w-4" />@{ig}
          </a>
        ) : null}

        <p className="text-xs text-slate-500">
          {votes} {locale === 'es' ? 'votos' : 'votes'}
          {location.certified_at
            ? ` · ${locale === 'es' ? 'Certificado' : 'Certified'} ${formatMonthYear(location.certified_at, locale)}`
            : ''}
        </p>

        {score == null && votes < 10 ? (
          <p className="flex items-start gap-2 text-sm text-amber-400/90">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {locale === 'es'
                ? `${needed} ${needed === 1 ? 'voto más' : 'votos más'} para revelar el Conscious Score`
                : `${needed} more vote${needed === 1 ? '' : 's'} to reveal the Conscious Score`}
            </span>
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-3">
          <Link
            href={`${linkPrefix}/${location.slug}`}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            {locale === 'es' ? 'Votar ↗' : 'Vote ↗'}
          </Link>
          {ig ? (
            <a
              href={`https://instagram.com/${ig}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-[#2d3748] px-4 py-2 text-sm text-slate-300 hover:border-emerald-500/40"
            >
              @Instagram
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}
