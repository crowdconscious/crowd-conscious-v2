'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Clock, Share2, Check } from 'lucide-react'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import { creatorCraftLabel } from '@/lib/creators/crafts'
import { CREATOR_SCORE_REVEAL_THRESHOLD } from '@/lib/creators/types'
import { CreatorTierBadge } from '@/components/creators/CreatorCertificationPanel'
import { ValueBadgeRow } from '@/components/locations/ValueBadge'
import { trackShare } from '@/lib/share-utils'

export type CreatorCardRow = {
  profile_id: string
  handle: string
  full_name: string | null
  avatar_url: string | null
  conscious_score: number | null
  total_votes: number
  certified_at: string | null
  craft: string | null
  craft_en: string | null
  city: string | null
  values: string[]
}

function scoreBadgeClass(score: number | null): string {
  if (score == null) return 'bg-slate-600'
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 6) return 'bg-amber-500'
  return 'bg-slate-500'
}

export function CreatorCard({
  creator,
  locale,
}: {
  creator: CreatorCardRow
  locale: CreatorLocale
}) {
  const t = getCreatorCopy(locale)
  const [copied, setCopied] = useState(false)

  const displayName = creator.full_name || `@${creator.handle}`
  const craft = creatorCraftLabel(creator.craft, creator.craft_en, locale)
  const votes = creator.total_votes ?? 0
  const score =
    creator.conscious_score != null && votes >= CREATOR_SCORE_REVEAL_THRESHOLD
      ? creator.conscious_score
      : null
  const needed = Math.max(0, CREATOR_SCORE_REVEAL_THRESHOLD - votes)

  const shareUrl = `https://crowdconscious.app/creators/${creator.handle}`
  const shareLine = t.creatorShareLine(displayName, shareUrl)
  const shareTarget = { type: 'creator' as const, creatorProfileId: creator.profile_id }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareLine)}`, '_blank')
    trackShare(shareTarget, 'whatsapp', 'creator_card', 'link')
  }

  const handleShare = async () => {
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : null
      if (nav?.share) {
        await nav.share({ title: displayName, text: shareLine, url: shareUrl })
        trackShare(shareTarget, 'native_share', 'creator_card', 'link')
        return
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(shareLine)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
        trackShare(shareTarget, 'clipboard', 'creator_card', 'link')
      }
    } catch {
      // User dismissed share sheet — silent.
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#2d3748] bg-[#0f1419]">
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-emerald-300">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{displayName}</h3>
          <p className="text-sm text-slate-400">
            @{creator.handle}
            {craft ? ` · ${craft}` : ''}
          </p>
        </div>
        <div
          className={`flex min-w-[3.25rem] flex-col items-center rounded-lg px-2 py-1 text-white shadow-md ${scoreBadgeClass(score)}`}
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

      <div className="mt-3">
        <CreatorTierBadge
          cert={{
            conscious_score: creator.conscious_score,
            total_votes: votes,
            certified_at: creator.certified_at,
          }}
          locale={locale}
        />
      </div>

      {creator.values.length > 0 ? (
        <ValueBadgeRow values={creator.values} locale={locale} size="xs" />
      ) : null}

      <p className="mt-3 text-xs text-slate-500">
        {votes} {t.certVotes}
        {creator.city ? ` · ${creator.city}` : ''}
      </p>

      {score == null && needed > 0 ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-amber-400/90">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{t.certVotesToReveal(needed)}</span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 pt-1">
        <Link
          href={`/creators/${creator.handle}`}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          {t.directoryViewProfile}
        </Link>
        <button
          type="button"
          onClick={handleWhatsApp}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#25D366]/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#25D366]"
          aria-label="WhatsApp"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.553 4.126 1.522 5.867L.06 23.636l5.9-1.482A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.877 0-3.63-.51-5.138-1.398l-.364-.217-3.507.88.935-3.415-.236-.378A9.93 9.93 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          <span>WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#2d3748] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
          aria-label={t.creatorShare}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span>{t.creatorShareCopied}</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>{t.creatorShare}</span>
            </>
          )}
        </button>
      </div>
    </article>
  )
}
