'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Instagram, Gift } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { locationCategoryLabel } from '@/lib/locations/categories'
import type { LocationCardRow } from './LocationCard'

type OutcomeRow = {
  id: string
  label: string
  sort_order: number | null
}

export default function LocationDetailClient({
  location,
  outcomes,
}: {
  location: LocationCardRow & {
    address: string | null
    website_url: string | null
    description: string | null
    description_en: string | null
    user_benefits: string | null
    user_benefits_en: string | null
    next_review_date: string | null
    current_market_id: string | null
  }
  outcomes: OutcomeRow[]
}) {
  const { language } = useLanguage()
  const locale = language
  const [confidence, setConfidence] = useState(7)
  const [reasoning, setReasoning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [choice, setChoice] = useState<'yes' | 'no' | null>(null)
  const [myVote, setMyVote] = useState<{
    outcome_label: string
    confidence: number
    outcome_id: string
  } | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!location.current_market_id) return
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/predictions/markets/${location.current_market_id}/my-vote`)
      const json = (await res.json()) as {
        vote: { outcome_id: string; confidence: number } | null
      }
      if (cancelled || !json.vote) return
      const o = outcomes.find((x) => x.id === json.vote!.outcome_id)
      setMyVote({
        outcome_id: json.vote.outcome_id,
        confidence: json.vote.confidence,
        outcome_label: o?.label ?? '',
      })
    })()
    return () => {
      cancelled = true
    }
  }, [location.current_market_id, outcomes])

  const yesId = outcomes[0]?.id
  const noId = outcomes[1]?.id

  const desc =
    locale === 'es'
      ? location.description || location.description_en
      : location.description_en || location.description
  const benefits =
    locale === 'es'
      ? location.user_benefits || location.user_benefits_en
      : location.user_benefits_en || location.user_benefits
  const why =
    locale === 'es'
      ? location.why_conscious || location.why_conscious_en
      : location.why_conscious_en || location.why_conscious

  const submit = async () => {
    if (!location.current_market_id) return
    const outcomeId = choice === 'yes' ? yesId : choice === 'no' ? noId : null
    if (!outcomeId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: location.current_market_id,
          outcome_id: outcomeId,
          confidence,
          reasoning: reasoning.trim() || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        alert(j.error || 'Vote failed')
        return
      }
      setEditing(false)
      setChoice(null)
      setMyVote({
        outcome_id: outcomeId,
        confidence,
        outcome_label: outcomes.find((o) => o.id === outcomeId)?.label ?? '',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const score = location.conscious_score
  const votes = location.total_votes ?? 0
  const needed = Math.max(0, 10 - votes)
  const ig = location.instagram_handle?.replace(/^@/, '') ?? ''

  const badgeClass =
    score == null ? 'bg-slate-600' : score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-amber-500' : 'bg-slate-500'

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
          month: 'long',
          year: 'numeric',
        })
      : '—'

  return (
    <div className="min-h-screen bg-[#0f1419] pb-8 pt-20 text-slate-100">
      <div className="relative h-[min(40vh,420px)] w-full overflow-hidden bg-[#0f1419]">
        {location.cover_image_url ? (
          <Image src={location.cover_image_url} alt="" fill className="object-cover" priority sizes="100vw" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">—</div>
        )}
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div
            className={`flex min-w-[5rem] flex-col items-center rounded-xl px-4 py-2 text-white ${badgeClass}`}
          >
            {score != null ? (
              <>
                <span className="text-2xl font-bold">{score.toFixed(1)}</span>
                <span className="text-xs opacity-90">/10</span>
              </>
            ) : (
              <span className="text-sm text-white/90">—</span>
            )}
            <span className="mt-1 text-[10px] text-white/80">
              {votes} {locale === 'es' ? 'votos' : 'votes'}
            </span>
          </div>
          {score == null && votes < 10 && (
            <p className="text-sm text-amber-400/90">
              {locale === 'es'
                ? `⏳ ${needed} ${needed === 1 ? 'voto más' : 'votos más'} para revelar el Conscious Score`
                : `⏳ ${needed} more vote${needed === 1 ? '' : 's'} to reveal the Conscious Score`}
            </p>
          )}
        </div>

        <div className="mb-6 flex gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#1a2029]">
            {location.logo_url ? (
              <Image src={location.logo_url} alt="" fill className="object-contain p-1" sizes="64px" />
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{location.name}</h1>
            <p className="text-slate-400">
              {location.neighborhood ? `${location.neighborhood}, ` : ''}
              {location.city} · {locationCategoryLabel(location.category, locale)}
            </p>
            {location.certified_at && (
              <p className="mt-1 text-sm text-emerald-400/90">
                ✓ {locale === 'es' ? 'Certificado desde' : 'Certified since'} {fmt(location.certified_at)}
              </p>
            )}
          </div>
        </div>

        {why ? <p className="mb-4 text-lg leading-relaxed text-slate-200">{why}</p> : null}
        {desc ? <p className="mb-4 text-slate-300 leading-relaxed">{desc}</p> : null}

        {benefits ? (
          <p className="mb-6 flex items-start gap-2 text-emerald-400/95">
            <Gift className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              {locale === 'es' ? 'Beneficio: ' : 'Benefit: '}
              {benefits}
            </span>
          </p>
        ) : null}

        {location.address ? (
          <p className="mb-2 flex items-start gap-2 text-slate-400">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {location.address}
          </p>
        ) : null}
        {location.website_url ? (
          <a
            href={location.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 block text-emerald-400 hover:text-emerald-300"
          >
            🌐 {location.website_url.replace(/^https?:\/\//, '')}
          </a>
        ) : null}
        {ig ? (
          <a
            href={`https://instagram.com/${ig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 flex items-center gap-2 text-slate-400 hover:text-emerald-400"
          >
            <Instagram className="h-4 w-4" />@{ig}
          </a>
        ) : (
          <div className="mb-8" />
        )}

        {location.current_market_id && yesId && noId && (
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {locale === 'es' ? '¿Es este lugar Consciente?' : 'Is this place Conscious?'}
            </h2>

            {myVote && !editing ? (
              <div className="space-y-4">
                <p className="text-slate-300">
                  {locale === 'es' ? 'Ya votaste' : 'You voted'}: {myVote.outcome_label} (
                  {locale === 'es' ? 'certeza' : 'confidence'} {myVote.confidence}/10).
                </p>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  {locale === 'es' ? 'Cambiar voto' : 'Change vote'}
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setChoice('yes')}
                    className={`min-h-[48px] flex-1 rounded-xl border px-4 py-3 font-semibold transition-colors ${
                      choice === 'yes'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-[#2d3748] text-slate-300'
                    }`}
                  >
                    {outcomes[0]?.label ?? 'Sí'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChoice('no')}
                    className={`min-h-[48px] flex-1 rounded-xl border px-4 py-3 font-semibold transition-colors ${
                      choice === 'no'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                        : 'border-[#2d3748] text-slate-300'
                    }`}
                  >
                    {outcomes[1]?.label ?? 'No'}
                  </button>
                </div>
                <p className="mb-2 text-sm text-slate-400">
                  {locale === 'es' ? '¿Qué tan seguro/a estás? (1-10)' : 'How confident are you? (1-10)'}
                </p>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="mb-6 w-full accent-emerald-500"
                />
                <label className="mb-2 block text-sm text-slate-400">
                  {locale === 'es' ? '¿Por qué? (opcional)' : 'Why? (optional)'}
                </label>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  rows={2}
                  className="mb-4 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] p-3 text-sm text-white"
                />
                <button
                  type="button"
                  disabled={!choice || submitting}
                  onClick={() => void submit()}
                  className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {locale === 'es' ? 'Votar' : 'Vote'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-10 border-t border-[#2d3748] pt-6 text-center text-sm text-slate-500">
          {location.next_review_date && (
            <p>
              {locale === 'es' ? 'Próxima revisión' : 'Next review'}: {fmt(location.next_review_date)}
            </p>
          )}
          <p className="mt-2">
            {locale === 'es'
              ? 'Tu voto alimenta el Fondo Consciente.'
              : 'Your vote supports the Conscious Fund.'}
          </p>
          <Link href="/locations" className="mt-4 inline-block text-emerald-400 hover:text-emerald-300">
            ← {locale === 'es' ? 'Todos los lugares' : 'All locations'}
          </Link>
        </div>
      </div>
    </div>
  )
}
