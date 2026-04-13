'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Check } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LocationCard, type LocationCardRow } from './LocationCard'
import { locationCategoryLabel, visibleLocationCategoryFilters } from '@/lib/locations/categories'

type OutcomeRow = {
  id: string
  market_id: string
  label: string
  probability: number
  vote_count: number
  total_confidence: number
  sort_order: number | null
}

export type ApiLocation = LocationCardRow & {
  current_market_id: string | null
  outcomes: OutcomeRow[]
  hasVoted: boolean
}

type VerifyRow = {
  name: string
  slug: string
  category: string
  city: string
  neighborhood: string | null
  status: string
  conscious_score: number | null
  total_votes: number
  certified_at: string | null
  next_review_date: string | null
  cover_image_url: string | null
  logo_url: string | null
}

function SwipeCard({
  loc,
  locale,
  onChoice,
}: {
  loc: ApiLocation
  locale: 'es' | 'en'
  onChoice: (dir: 'yes' | 'no') => void
}) {
  const why =
    locale === 'es'
      ? loc.why_conscious || loc.why_conscious_en
      : loc.why_conscious_en || loc.why_conscious
  const cat = locationCategoryLabel(loc.category, locale)

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -220, right: 220 }}
      dragElastic={0.65}
      onDragEnd={(_, info) => {
        if (info.offset.x > 90) onChoice('yes')
        else if (info.offset.x < -90) onChoice('no')
      }}
      className="relative w-full max-w-sm cursor-grab touch-pan-y overflow-hidden rounded-2xl border border-[#2d3748] bg-[#1a2029] shadow-xl active:cursor-grabbing"
    >
      <div className="relative h-48 w-full bg-[#0f1419]">
        {loc.cover_image_url ? (
          <Image src={loc.cover_image_url} alt="" fill className="object-cover" sizes="400px" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">—</div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#0f1419]">
            {loc.logo_url ? (
              <Image src={loc.logo_url} alt="" fill className="object-contain p-1" sizes="44px" />
            ) : null}
          </div>
          <div>
            <h3 className="font-semibold text-white">{loc.name}</h3>
            <p className="text-sm text-slate-400">
              {loc.neighborhood ? `${loc.neighborhood} · ` : ''}
              {cat}
            </p>
          </div>
        </div>
        {why ? <p className="text-sm leading-relaxed text-slate-300 line-clamp-4">{why}</p> : null}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => onChoice('no')}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20"
            aria-label={locale === 'es' ? 'No' : 'No'}
          >
            <X className="h-6 w-6" />
            <span className="font-semibold">{locale === 'es' ? 'NO' : 'NO'}</span>
          </button>
          <button
            type="button"
            onClick={() => onChoice('yes')}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20"
            aria-label={locale === 'es' ? 'Sí' : 'Yes'}
          >
            <span className="font-semibold">{locale === 'es' ? 'SÍ' : 'YES'}</span>
            <Check className="h-6 w-6" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-500">
          {locale === 'es' ? '← Desliza o toca' : '← Swipe or tap →'}
        </p>
      </div>
    </motion.div>
  )
}

export default function LocationsPage() {
  const { language } = useLanguage()
  const locale = language
  const [allLocations, setAllLocations] = useState<ApiLocation[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [verifyQuery, setVerifyQuery] = useState('')
  const [verifyResult, setVerifyResult] = useState<VerifyRow | null>(null)
  const [verifyMany, setVerifyMany] = useState<VerifyRow[] | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifySearched, setVerifySearched] = useState(false)

  const [pendingSwipe, setPendingSwipe] = useState<{
    loc: ApiLocation
    dir: 'yes' | 'no'
  } | null>(null)
  const [confidence, setConfidence] = useState(7)
  const [reasoning, setReasoning] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (city) params.set('city', city)
      const res = await fetch(`/api/locations?${params.toString()}`)
      const json = (await res.json()) as { locations?: ApiLocation[]; cities?: string[] }
      setAllLocations(json.locations ?? [])
      if (json.cities?.length) setCityOptions(json.cities)
    } catch {
      setAllLocations([])
    } finally {
      setLoading(false)
    }
  }, [city])

  useEffect(() => {
    load()
  }, [load])

  const filteredLocations = useMemo(() => {
    if (category === 'all') return allLocations
    return allLocations.filter((l) => l.category === category)
  }, [allLocations, category])

  const categoryPillDefs = useMemo(() => {
    const active = new Set(allLocations.map((l) => l.category))
    return visibleLocationCategoryFilters(active)
  }, [allLocations])

  const cities =
    cityOptions.length > 0
      ? cityOptions
      : [...new Set(allLocations.map((l) => l.city))].sort()

  const swipeQueue = useMemo(() => {
    return filteredLocations.filter(
      (l) => l.current_market_id && !l.hasVoted && (l.outcomes?.length ?? 0) >= 2
    )
  }, [filteredLocations])

  const [stack, setStack] = useState<ApiLocation[]>([])
  useEffect(() => {
    setStack(swipeQueue)
  }, [swipeQueue])

  const top = stack[0]

  const openSheet = (loc: ApiLocation, dir: 'yes' | 'no') => {
    setPendingSwipe({ loc, dir })
    setConfidence(7)
    setReasoning('')
  }

  const confirmVote = async () => {
    if (!pendingSwipe) return
    const { loc, dir } = pendingSwipe
    const yesId = loc.outcomes[0]?.id
    const noId = loc.outcomes[1]?.id
    const outcomeId = dir === 'yes' ? yesId : noId
    if (!loc.current_market_id || !outcomeId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: loc.current_market_id,
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
      setPendingSwipe(null)
      setStack((prev) => prev.filter((x) => x.id !== loc.id))
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const runVerify = async () => {
    const q = verifyQuery.trim()
    if (!q) return
    setVerifyLoading(true)
    setVerifyResult(null)
    setVerifyMany(null)
    setVerifySearched(false)
    try {
      const res = await fetch(`/api/locations/verify?q=${encodeURIComponent(q)}`)
      const json = (await res.json()) as {
        location?: VerifyRow | null
        locations?: VerifyRow[]
      }
      setVerifySearched(true)
      if (json.locations && json.locations.length > 1) {
        setVerifyMany(json.locations)
      } else {
        setVerifyResult(json.location ?? null)
      }
    } finally {
      setVerifyLoading(false)
    }
  }

  const t = {
    heroTitle: locale === 'es' ? 'Conscious Locations' : 'Conscious Locations',
    heroSub: locale === 'es' ? 'Lugares y marcas verificados por la comunidad' : 'Places and brands verified by the community',
    swipeTitle: locale === 'es' ? '¿Son realmente Conscientes?' : 'Are they truly Conscious?',
    swipeSub: locale === 'es' ? 'Tú decides. Desliza para votar.' : 'You decide. Swipe to vote.',
    verifyTitle: locale === 'es' ? 'Verifica un establecimiento' : 'Verify an establishment',
    verifySub: locale === 'es' ? 'Confirma que el sello Consciente está vigente.' : 'Confirm the Conscious seal is valid.',
    verifyPh: locale === 'es' ? 'Busca por nombre...' : 'Search by name...',
    verifyBtn: locale === 'es' ? 'Verificar' : 'Verify',
    confTitle: locale === 'es' ? '¿Qué tan seguro/a estás?' : 'How confident are you?',
    why: locale === 'es' ? '¿Por qué? (opcional)' : 'Why? (optional)',
    confirm: locale === 'es' ? 'Confirmar voto' : 'Confirm vote',
    doneTitle: locale === 'es' ? 'Has votado por todos los lugares. ¡Gracias!' : "You've voted on every place. Thanks!",
    doneSub: locale === 'es' ? 'Agregamos nuevos cada semana. Síguenos → @crowdconscious' : 'We add new ones weekly. Follow → @crowdconscious',
    sheetCancel: locale === 'es' ? 'Cancelar' : 'Cancel',
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">{t.heroTitle}</h1>
          <p className="mt-2 text-slate-400">{t.heroSub}</p>
        </header>

        <section className="mb-12">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{locale === 'es' ? 'Ciudad' : 'City'}:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCity(null)
                  setCategory('all')
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  city === null ? 'bg-emerald-500 text-white' : 'bg-[#1a2029] text-slate-300 border border-[#2d3748]'
                }`}
              >
                {locale === 'es' ? 'Todas' : 'All'}
              </button>
              {cities.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCity(c)
                    setCategory('all')
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    city === c ? 'bg-emerald-500 text-white' : 'bg-[#1a2029] text-slate-300 border border-[#2d3748]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            {categoryPillDefs.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  category === c.value ? 'bg-emerald-500/90 text-white' : 'bg-[#1a2029] text-slate-400 border border-[#2d3748]'
                }`}
              >
                {locale === 'es' ? c.label.es : c.label.en}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-center text-slate-500">{locale === 'es' ? 'Cargando…' : 'Loading…'}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredLocations.map((loc) => (
                <LocationCard key={loc.id} location={loc} locale={locale} />
              ))}
            </div>
          )}

          {!loading && filteredLocations.length === 0 && (
            <p className="text-center text-slate-500">{locale === 'es' ? 'Sin resultados.' : 'No results.'}</p>
          )}
        </section>

        <section className="mb-16 border-t border-[#2d3748] pt-12">
          <h2 className="mb-1 text-center text-2xl font-bold text-white">{t.swipeTitle}</h2>
          <p className="mb-8 text-center text-slate-400">{t.swipeSub}</p>

          {!top && swipeQueue.length === 0 && !loading && filteredLocations.length > 0 && (
            <div className="mx-auto max-w-md rounded-xl border border-emerald-500/30 bg-[#1a2029] p-6 text-center">
              <p className="text-lg text-emerald-300">✓ {t.doneTitle}</p>
              <p className="mt-2 text-sm text-slate-400">{t.doneSub}</p>
            </div>
          )}

          <div className="mx-auto flex w-full max-w-sm justify-center px-2">
            <AnimatePresence mode="wait">
              {top ? (
                <motion.div
                  key={top.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <SwipeCard loc={top} locale={locale} onChoice={(d) => openSheet(top, d)} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {!loading && allLocations.length === 0 && (
            <p className="text-center text-sm text-slate-500">
              {locale === 'es' ? 'No hay lugares activos aún.' : 'No active locations yet.'}
            </p>
          )}
        </section>

        <section className="border-t border-[#2d3748] pt-12">
          <h2 className="mb-1 text-center text-2xl font-bold text-white">{t.verifyTitle}</h2>
          <p className="mb-6 text-center text-slate-400">{t.verifySub}</p>

          <div className="mx-auto mb-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={verifyQuery}
                onChange={(e) => setVerifyQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runVerify()}
                placeholder={t.verifyPh}
                className="w-full rounded-xl border border-[#2d3748] bg-[#1a2029] py-3 pl-10 pr-4 text-white placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={runVerify}
              disabled={verifyLoading}
              className="min-h-[48px] rounded-xl bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {verifyLoading ? '…' : t.verifyBtn}
            </button>
          </div>

          {verifyMany && verifyMany.length > 0 && (
            <ul className="mx-auto max-w-xl space-y-2">
              {verifyMany.map((r) => (
                <li key={r.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyResult(r)
                      setVerifyMany(null)
                    }}
                    className="w-full rounded-lg border border-[#2d3748] bg-[#1a2029] p-4 text-left text-white hover:border-emerald-500/40"
                  >
                    {r.name} · {r.city}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {verifyResult && (
            <VerifyResultCard row={verifyResult} locale={locale} />
          )}

          {verifySearched && verifyResult === null && !verifyMany && !verifyLoading && (
            <p className="text-center text-slate-400">
              {locale === 'es'
                ? 'No encontramos ese establecimiento. ¿Crees que debería ser Consciente? (próximamente: nominar)'
                : "We couldn't find that establishment. Think it should be Conscious? (nominations coming soon)"}
            </p>
          )}
        </section>
      </div>

      <AnimatePresence>
        {pendingSwipe && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2d3748] bg-[#1a2029] p-6 shadow-2xl"
          >
            <p className="mb-4 text-center font-medium text-white">{t.confTitle}</p>
            <input
              type="range"
              min={1}
              max={10}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="mb-6 w-full accent-emerald-500"
            />
            <p className="mb-4 text-center text-sm text-slate-400">
              1 ··· <span className="text-white font-semibold">{confidence}</span> ··· 10
            </p>
            <label className="mb-2 block text-sm text-slate-400">{t.why}</label>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={2}
              className="mb-4 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] p-3 text-sm text-white"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingSwipe(null)}
                className="flex-1 rounded-lg border border-[#2d3748] py-3 text-slate-300"
              >
                {t.sheetCancel}
              </button>
              <button
                type="button"
                onClick={() => void confirmVote()}
                disabled={submitting}
                className="flex-1 rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? '…' : t.confirm}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function VerifyResultCard({ row, locale }: { row: VerifyRow; locale: 'es' | 'en' }) {
  const status = row.status
  const badge =
    status === 'active'
      ? { label: locale === 'es' ? '✓ VERIFICADO' : '✓ VERIFIED', className: 'bg-emerald-500/20 text-emerald-300' }
      : status === 'revoked'
        ? { label: locale === 'es' ? '✗ SELLO REVOCADO' : '✗ SEAL REVOKED', className: 'bg-red-500/20 text-red-300' }
        : status === 'under_review'
          ? {
              label: locale === 'es' ? '⏳ EN REVISIÓN' : '⏳ UNDER REVIEW',
              className: 'bg-amber-500/20 text-amber-200',
            }
          : { label: status.toUpperCase(), className: 'bg-slate-600/40 text-slate-200' }

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
          month: 'long',
          year: 'numeric',
          day: 'numeric',
        })
      : '—'

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
      <div className={`mb-4 inline-block rounded-lg px-3 py-1 text-sm font-bold ${badge.className}`}>{badge.label}</div>
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-white">{row.name}</h3>
        <p className="text-slate-400">
          {row.neighborhood ? `${row.neighborhood} · ` : ''}
          {locationCategoryLabel(row.category, locale)}
        </p>
        {row.conscious_score != null && (
          <p className="text-slate-300">
            {locale === 'es' ? 'Conscious Score' : 'Conscious Score'}: {row.conscious_score.toFixed(1)}/10
          </p>
        )}
        <p className="text-slate-400">
          {locale === 'es' ? 'Votos totales' : 'Total votes'}: {row.total_votes ?? 0}
        </p>
        {row.certified_at && (
          <p className="text-slate-400">
            {locale === 'es' ? 'Certificado desde' : 'Certified since'}: {fmt(row.certified_at)}
          </p>
        )}
        {row.next_review_date && (
          <p className="text-slate-400">
            {locale === 'es' ? 'Próxima revisión' : 'Next review'}: {fmt(row.next_review_date)}
          </p>
        )}
        {status === 'revoked' && row.certified_at && (
          <p className="text-sm text-red-300/90">
            {locale === 'es'
              ? `Este establecimiento perdió su certificación.`
              : `This establishment lost its certification.`}
          </p>
        )}
        {status === 'under_review' && (
          <p className="text-sm text-amber-200/90">
            {locale === 'es'
              ? 'Este establecimiento está siendo evaluado por la comunidad.'
              : 'This establishment is being evaluated by the community.'}
          </p>
        )}
        <Link
          href={`/locations/${row.slug}`}
          className="inline-flex mt-4 min-h-[44px] items-center text-emerald-400 hover:text-emerald-300"
        >
          {locale === 'es' ? 'Votar por este lugar ↗' : 'Vote for this place ↗'}
        </Link>
      </div>
    </div>
  )
}
