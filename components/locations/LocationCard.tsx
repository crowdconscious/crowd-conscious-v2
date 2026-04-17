'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MapPin, Instagram, Gift, Clock, Share2, Check } from 'lucide-react'
import type { Database, Json } from '@/types/database'
import { locationCategoryLabel } from '@/lib/locations/categories'
import { LocationCoverImage, LocationLogoImage } from '@/components/locations/LocationRemoteImage'
import { parseMetadataValues } from '@/lib/locations/conscious-values'
import { ValueBadgeRow } from '@/components/locations/ValueBadge'
import { trackShare } from '@/lib/share-utils'

export type LocationCardRow = {
  id: string
  name: string
  slug: string
  category: Database['public']['Tables']['conscious_locations']['Row']['category']
  city: string
  neighborhood: string | null
  latitude?: number | null
  longitude?: number | null
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
  const [copied, setCopied] = useState(false)

  const shareUrl = `https://crowdconscious.app${linkPrefix}/${location.slug}`
  const shareLine =
    locale === 'es'
      ? `¿Es ${location.name} un Lugar Consciente? Vota aquí: ${shareUrl}`
      : `Is ${location.name} a Conscious Location? Vote here: ${shareUrl}`

  const shareTarget = { type: 'location' as const, locationId: location.id }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareLine)}`, '_blank')
    trackShare(shareTarget, 'whatsapp', 'location_card')
  }

  const handleShare = async () => {
    try {
      const shareData = {
        title: location.name,
        text: shareLine,
        url: shareUrl,
      }
      const nav = typeof navigator !== 'undefined' ? navigator : null
      if (nav?.share) {
        await nav.share(shareData)
        trackShare(shareTarget, 'native_share', 'location_card')
        return
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(shareLine)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
        trackShare(shareTarget, 'clipboard', 'location_card')
      }
    } catch {
      // User dismissed share sheet — silent.
    }
  }

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
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            <Instagram className="h-4 w-4" />
            <span>
              @{ig} ·{' '}
              <span className="font-normal text-slate-400 hover:text-emerald-300">
                {locale === 'es' ? 'Síguelos en Instagram' : 'Follow on Instagram'}
              </span>
            </span>
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

        <Link
          href={`/pulse/pilot?business=${encodeURIComponent(location.name)}&source=location_card`}
          className="text-xs text-slate-500 underline-offset-2 hover:text-emerald-400 hover:underline"
        >
          {locale === 'es'
            ? '¿Eres el dueño? → Activa Pulse para tu negocio'
            : 'Are you the owner? → Activate Pulse for your business'}
        </Link>

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
          <button
            type="button"
            onClick={handleWhatsApp}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#25D366]/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#25D366]"
            aria-label={locale === 'es' ? 'Compartir en WhatsApp' : 'Share on WhatsApp'}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.553 4.126 1.522 5.867L.06 23.636l5.9-1.482A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.877 0-3.63-.51-5.138-1.398l-.364-.217-3.507.88.935-3.415-.236-.378A9.93 9.93 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            <span>{locale === 'es' ? 'WhatsApp' : 'WhatsApp'}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#2d3748] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
            aria-label={locale === 'es' ? 'Compartir lugar' : 'Share location'}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>{locale === 'es' ? '¡Copiado!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>{locale === 'es' ? 'Compartir' : 'Share'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
