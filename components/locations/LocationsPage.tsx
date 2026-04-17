'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Check,
  Wind,
  Droplets,
  Building2,
  Recycle,
  Handshake,
  Gift,
  Tag,
  Star,
  Heart,
  Award,
  ChevronDown,
  ChevronRight,
  Map as MapIcon,
  LayoutGrid,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase-client'
import { LocationCard, type LocationCardRow } from './LocationCard'
import { LocationCoverImage, LocationLogoImage } from '@/components/locations/LocationRemoteImage'
import { locationCategoryLabel, visibleLocationCategoryFilters } from '@/lib/locations/categories'
import { IconBadge } from '@/components/ui/IconBadge'
import { parseMetadataValues } from '@/lib/locations/conscious-values'
import { ValueBadgeRow } from '@/components/locations/ValueBadge'
import { NearestToAztecaSection } from './NearestToAztecaSection'
import { isAztecaModuleVisible } from '@/lib/locations/geo'

const LocationsMap = dynamic(() => import('./LocationsMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-[#2d3748] bg-[#1a2029] text-sm text-slate-500">
      Cargando mapa…
    </div>
  ),
})

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
  const valueKeys = parseMetadataValues(loc.metadata)

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[340px]">
      <motion.div
        drag="x"
        dragConstraints={{ left: -220, right: 220 }}
        dragElastic={0.65}
        onDragEnd={(_, info) => {
          if (info.offset.x > 80) onChoice('yes')
          else if (info.offset.x < -80) onChoice('no')
        }}
        style={{ touchAction: 'none' }}
        className="absolute inset-0 flex cursor-grab select-none flex-col overflow-hidden rounded-2xl border border-[#2d3748] bg-[#1a2029] shadow-xl active:cursor-grabbing"
      >
        <div className="relative h-48 w-full shrink-0 overflow-hidden bg-[#0f1419]">
          <LocationCoverImage
            url={loc.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto p-4">
          <div className="flex gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#0f1419]">
              <LocationLogoImage
                url={loc.logo_url}
                alt=""
                className="absolute inset-0 h-full w-full object-contain p-1"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white">{loc.name}</h3>
              <p className="text-sm text-slate-400">
                {loc.neighborhood ? `${loc.neighborhood} · ` : ''}
                {cat}
              </p>
            </div>
          </div>
          {why ? <p className="text-sm leading-relaxed text-slate-300 line-clamp-4">{why}</p> : null}
          {valueKeys.length > 0 ? (
            <ValueBadgeRow values={valueKeys} locale={locale} size="xs" />
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-4 pt-2">
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
    </div>
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
  const [showAnonVotePrompt, setShowAnonVotePrompt] = useState(false)
  const [showAliasModal, setShowAliasModal] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const [voteError, setVoteError] = useState<string | null>(null)
  const [nominateOpen, setNominateOpen] = useState(false)
  const [nominateForm, setNominateForm] = useState({
    name: '',
    location: '',
    why: '',
    instagram: '',
    submitter_email: '',
  })
  const [nominateBusy, setNominateBusy] = useState(false)
  const [nominateBanner, setNominateBanner] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards')
  const showAzteca = useMemo(() => isAztecaModuleVisible(), [])

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
    setVoteError(null)
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
    setVoteError(null)
    try {
      const res = await fetch('/api/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          market_id: loc.current_market_id,
          outcome_id: outcomeId,
          confidence,
          reasoning: reasoning.trim() || null,
        }),
      })
      const j = (await res.json()) as { error?: string; requiresAlias?: boolean }
      if (res.status === 401 && j.requiresAlias === true) {
        setShowAliasModal(true)
        return
      }
      if (!res.ok) {
        setVoteError(
          typeof j.error === 'string'
            ? j.error
            : locale === 'es'
              ? 'No se pudo registrar el voto'
              : 'Vote failed'
        )
        return
      }
      setPendingSwipe(null)
      setStack((prev) => prev.filter((x) => x.id !== loc.id))
      const {
        data: { session },
      } = await createClient().auth.getSession()
      if (!session?.user) setShowAnonVotePrompt(true)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const joinAliasAndRetry = async (alias: string) => {
    const clean =
      alias.trim() ||
      (locale === 'es' ? 'Invitado' : 'Guest')
    const sessionId = crypto.randomUUID()
    const res = await fetch('/api/live/join-anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ alias: clean, emoji: '🎯', session_id: sessionId }),
    })
    const j = (await res.json()) as { error?: string }
    if (!res.ok) {
      setVoteError(j.error ?? (locale === 'es' ? 'No se pudo guardar el alias' : 'Could not save alias'))
      return
    }
    setShowAliasModal(false)
    setAliasInput('')
    await confirmVote()
  }

  const submitNomination = async () => {
    const { name, location: locLine, why } = nominateForm
    if (!name.trim() || !locLine.trim() || !why.trim()) {
      setNominateBanner(
        locale === 'es' ? 'Completa los campos obligatorios' : 'Fill in the required fields'
      )
      return
    }
    setNominateBusy(true)
    setNominateBanner(null)
    try {
      const res = await fetch('/api/locations/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          location: locLine.trim(),
          why: why.trim(),
          instagram: nominateForm.instagram.trim() || undefined,
          submitter_email: nominateForm.submitter_email.trim() || undefined,
        }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setNominateBanner(j.error ?? (locale === 'es' ? 'Error al enviar' : 'Submit failed'))
        return
      }
      setNominateOpen(false)
      setNominateForm({
        name: '',
        location: '',
        why: '',
        instagram: '',
        submitter_email: '',
      })
      setNominateBanner(
        locale === 'es' ? '¡Nominación enviada! La revisaremos pronto.' : 'Nomination submitted! We\'ll review it soon.'
      )
    } finally {
      setNominateBusy(false)
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
    anonVoteTitle: locale === 'es' ? '¡Voto registrado!' : 'Vote recorded!',
    anonVoteBody:
      locale === 'es'
        ? 'Crea una cuenta para ganar XP y aparecer en la clasificación.'
        : 'Create an account to earn XP and appear on the leaderboard.',
    anonSignUp: locale === 'es' ? 'Registrarse' : 'Sign up',
    anonKeep: locale === 'es' ? 'Seguir votando' : 'Keep voting',
    aliasTitle: locale === 'es' ? 'Elige un alias' : 'Choose an alias',
    aliasBody:
      locale === 'es'
        ? 'Tu alias aparece junto a tu voto. Puedes cambiarlo después.'
        : 'Your alias appears with your vote. You can change it later.',
    aliasPlaceholder: locale === 'es' ? 'Tu alias…' : 'Your alias…',
    aliasGuest: locale === 'es' ? 'Continuar como Invitado' : 'Continue as Guest',
    aliasConfirm: locale === 'es' ? 'Confirmar' : 'Confirm',
    nominateTitle: locale === 'es' ? 'Nominar un lugar' : 'Nominate a place',
    nominateSub:
      locale === 'es'
        ? 'Las nominaciones son revisadas por nuestro equipo.'
        : 'Nominations are reviewed by our team.',
    nominateSend: locale === 'es' ? 'Enviar nominación' : 'Submit nomination',
    nominateCancel: locale === 'es' ? 'Cancelar' : 'Cancel',
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      {nominateBanner ? (
        <div className="fixed left-0 right-0 top-16 z-[60] mx-auto max-w-lg px-4">
          <div className="rounded-xl border border-emerald-500/40 bg-[#1a2029] px-4 py-3 text-center text-sm text-emerald-200 shadow-lg">
            {nominateBanner}
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-8">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">{t.heroTitle}</h1>
          <p className="mt-2 text-slate-400">{t.heroSub}</p>
        </header>

        {/* ═══════════════════════════════════════════
            SECTION: What does it mean to be Conscious?
            ═══════════════════════════════════════════ */}
        <section className="mb-12 max-w-3xl mx-auto px-0">
          <div className="text-center mb-8">
            <h2 className="text-white text-xl sm:text-2xl font-bold mb-3">
              {locale === 'es'
                ? '¿Qué significa ser un Conscious Location?'
                : 'What does it mean to be a Conscious Location?'}
            </h2>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              {locale === 'es'
                ? 'Un Conscious Location es un lugar, marca o persona verificada por la comunidad que se alinea con al menos uno de nuestros 5 valores fundamentales. No basta con decirlo — la comunidad vota, califica su certeza, y el Conscious Score se actualiza en tiempo real.'
                : "A Conscious Location is a place, brand, or person verified by the community that aligns with at least one of our 5 core values. Saying it isn't enough — the community votes, rates their confidence, and the Conscious Score updates in real time."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            <div className="bg-[#1a2029] border border-[#2d3748] rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2" aria-hidden>
                <IconBadge icon={Wind} size="lg" />
              </div>
              <h3 className="text-white text-sm font-bold mb-1">
                {locale === 'es' ? 'Aire Limpio' : 'Clean Air'}
              </h3>
              <p className="text-gray-500 text-xs leading-snug">
                {locale === 'es'
                  ? 'Reducción de emisiones, espacios verdes, movilidad sustentable'
                  : 'Emissions reduction, green spaces, sustainable mobility'}
              </p>
            </div>
            <div className="bg-[#1a2029] border border-[#2d3748] rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2" aria-hidden>
                <IconBadge icon={Droplets} size="lg" />
              </div>
              <h3 className="text-white text-sm font-bold mb-1">
                {locale === 'es' ? 'Agua Limpia' : 'Clean Water'}
              </h3>
              <p className="text-gray-500 text-xs leading-snug">
                {locale === 'es'
                  ? 'Uso responsable del agua, tratamiento, acceso comunitario'
                  : 'Responsible water use, treatment, community access'}
              </p>
            </div>
            <div className="bg-[#1a2029] border border-[#2d3748] rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2" aria-hidden>
                <IconBadge icon={Building2} size="lg" />
              </div>
              <h3 className="text-white text-sm font-bold mb-1">
                {locale === 'es' ? 'Ciudades Seguras' : 'Safe Cities'}
              </h3>
              <p className="text-gray-500 text-xs leading-snug">
                {locale === 'es'
                  ? 'Inclusión, seguridad comunitaria, accesibilidad, empleo local'
                  : 'Inclusion, community safety, accessibility, local employment'}
              </p>
            </div>
            <div className="bg-[#1a2029] border border-[#2d3748] rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2" aria-hidden>
                <IconBadge icon={Recycle} size="lg" />
              </div>
              <h3 className="text-white text-sm font-bold mb-1">
                {locale === 'es' ? 'Cero Desperdicio' : 'Zero Waste'}
              </h3>
              <p className="text-gray-500 text-xs leading-snug">
                {locale === 'es'
                  ? 'Economía circular, reducción de plásticos, compostaje'
                  : 'Circular economy, plastic reduction, composting'}
              </p>
            </div>
            <div className="bg-[#1a2029] border border-[#2d3748] rounded-xl p-4 text-center col-span-2 sm:col-span-1 lg:col-span-1 max-w-xs sm:max-w-none mx-auto sm:mx-0 w-full lg:max-w-none">
              <div className="flex justify-center mb-2" aria-hidden>
                <IconBadge icon={Handshake} size="lg" />
              </div>
              <h3 className="text-white text-sm font-bold mb-1">
                {locale === 'es' ? 'Comercio Justo' : 'Fair Trade'}
              </h3>
              <p className="text-gray-500 text-xs leading-snug">
                {locale === 'es'
                  ? 'Productores locales, precios justos, cadenas trazables'
                  : 'Local producers, fair prices, traceable supply chains'}
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION: How it works
            ═══════════════════════════════════════════ */}
        <section className="mb-12 max-w-2xl mx-auto px-0">
          <h2 className="text-center text-white text-lg font-bold mb-6 sm:mb-8">
            {locale === 'es' ? 'Cómo funciona' : 'How it works'}
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch gap-0 sm:gap-4">
            <div className="flex-1 bg-[#1a2029] border border-[#2d3748] rounded-xl p-5 text-center">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-emerald-400 font-bold">1</span>
              </div>
              <h4 className="text-white text-sm font-bold mb-1">
                {locale === 'es' ? 'Desliza' : 'Swipe'}
              </h4>
              <p className="text-gray-400 text-xs whitespace-pre-line">
                {locale === 'es'
                  ? 'Sí = es Consciente\nNo = no estoy convencido'
                  : 'Yes = Conscious\nNo = not convinced'}
              </p>
            </div>
            <div className="flex sm:hidden justify-center py-2 text-gray-600" aria-hidden>
              <ChevronDown className="h-5 w-5" />
            </div>
            <div className="hidden sm:flex items-center text-gray-600 px-1" aria-hidden>
              <ChevronRight className="h-5 w-5" />
            </div>
            <div className="flex-1 bg-[#1a2029] border border-[#2d3748] rounded-xl p-5 text-center">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-emerald-400 font-bold">2</span>
              </div>
              <h4 className="text-white text-sm font-bold mb-1">
                {locale === 'es' ? 'Califica tu certeza' : 'Rate your confidence'}
              </h4>
              <p className="text-gray-400 text-xs">
                {locale === 'es'
                  ? 'Del 1 al 10. No es lo mismo "creo que sí" que "estoy seguro"'
                  : `From 1 to 10. "I think so" isn't the same as "I'm certain"`}
              </p>
            </div>
            <div className="flex sm:hidden justify-center py-2 text-gray-600" aria-hidden>
              <ChevronDown className="h-5 w-5" />
            </div>
            <div className="hidden sm:flex items-center text-gray-600 px-1" aria-hidden>
              <ChevronRight className="h-5 w-5" />
            </div>
            <div className="flex-1 bg-[#1a2029] border border-[#2d3748] rounded-xl p-5 text-center">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-emerald-400 font-bold">3</span>
              </div>
              <h4 className="text-white text-sm font-bold mb-1">
                {locale === 'es' ? 'El Score aparece' : 'Score revealed'}
              </h4>
              <p className="text-gray-400 text-xs">
                {locale === 'es'
                  ? 'Después de 10 votos, el Conscious Score (0-10) se muestra en vivo'
                  : 'After 10 votes, the Conscious Score (0-10) appears live'}
              </p>
            </div>
          </div>

          <div className="mt-4 bg-[#1a2029]/50 border border-[#2d3748] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-xs leading-relaxed">
              {locale === 'es'
                ? 'El Conscious Score = aprobación × certeza promedio. Un lugar con mucha aprobación pero baja certeza obtiene un score menor que uno con menos votos pero alta convicción. Se revisa cada 90 días.'
                : 'Conscious Score = approval × average confidence. A place with high approval but low confidence scores lower than one with fewer votes but strong conviction. Reviewed every 90 days.'}
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION: Perks for visitors
            ═══════════════════════════════════════════ */}
        <section className="mb-12 max-w-3xl mx-auto px-0">
          <div className="bg-gradient-to-r from-[#1a2029] to-[#1a2029] border border-emerald-500/20 rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-2" aria-hidden>
                <IconBadge icon={Gift} size="lg" />
              </div>
              <h2 className="text-white text-lg sm:text-xl font-bold mt-2">
                {locale === 'es' ? 'Beneficios para visitantes' : 'Perks for visitors'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {locale === 'es'
                  ? 'Los Conscious Locations ofrecen beneficios exclusivos a la comunidad de Crowd Conscious'
                  : 'Conscious Locations offer exclusive perks to the Crowd Conscious community'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex justify-center mb-2" aria-hidden>
                  <IconBadge icon={Tag} size="sm" />
                </div>
                <h4 className="text-white text-sm font-semibold mb-1">
                  {locale === 'es' ? 'Descuentos' : 'Discounts'}
                </h4>
                <p className="text-gray-500 text-xs">
                  {locale === 'es'
                    ? 'Códigos exclusivos y promociones para miembros de la comunidad'
                    : 'Exclusive codes and promotions for community members'}
                </p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-2" aria-hidden>
                  <IconBadge icon={Star} size="sm" />
                </div>
                <h4 className="text-white text-sm font-semibold mb-1">
                  {locale === 'es' ? 'Experiencias VIP' : 'VIP Experiences'}
                </h4>
                <p className="text-gray-500 text-xs">
                  {locale === 'es'
                    ? 'Acceso a eventos, degustaciones y activaciones exclusivas'
                    : 'Access to events, tastings, and exclusive activations'}
                </p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-2" aria-hidden>
                  <IconBadge icon={Heart} size="sm" />
                </div>
                <h4 className="text-white text-sm font-semibold mb-1">
                  {locale === 'es' ? 'Impacto real' : 'Real impact'}
                </h4>
                <p className="text-gray-500 text-xs">
                  {locale === 'es'
                    ? 'Al visitar un Conscious Location, apoyas negocios que invierten en su comunidad'
                    : 'By visiting a Conscious Location, you support businesses investing in their community'}
                </p>
              </div>
            </div>

            <p className="text-center text-emerald-400 text-xs mt-6">
              {locale === 'es'
                ? 'Cada Conscious Location muestra sus beneficios específicos en su tarjeta'
                : 'Each Conscious Location shows its specific perks on its card'}
            </p>
          </div>
        </section>

        <div className="border-t border-[#2d3748] mb-8" aria-hidden />

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

          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
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

            <div
              className="inline-flex rounded-full border border-[#2d3748] bg-[#1a2029] p-1"
              role="tablist"
              aria-label={locale === 'es' ? 'Modo de vista' : 'View mode'}
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'cards'}
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'cards' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {locale === 'es' ? 'Tarjetas' : 'Cards'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'map'}
                onClick={() => setViewMode('map')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'map' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                {locale === 'es' ? 'Mapa' : 'Map'}
              </button>
            </div>
          </div>

          {showAzteca && !loading && filteredLocations.length > 0 ? (
            <NearestToAztecaSection locations={filteredLocations} locale={locale} />
          ) : null}

          {loading ? (
            <p className="text-center text-slate-500">{locale === 'es' ? 'Cargando…' : 'Loading…'}</p>
          ) : viewMode === 'map' ? (
            <LocationsMap locations={filteredLocations} locale={locale} />
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

          {voteError ? (
            <p className="mb-4 text-center text-sm text-red-400" role="alert">
              {voteError}
            </p>
          ) : null}
          <div className="mx-auto flex w-full justify-center px-2">
            <AnimatePresence mode="wait">
              {top ? (
                <motion.div
                  key={top.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="w-full max-w-[340px]"
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
              {locale === 'es' ? (
                <>
                  No encontramos ese establecimiento.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setNominateOpen(true)
                      setNominateBanner(null)
                    }}
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Nomínalo en el Buzón Consciente
                  </button>
                  .
                </>
              ) : (
                <>
                  We couldn&apos;t find that establishment.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setNominateOpen(true)
                      setNominateBanner(null)
                    }}
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Nominate it via the Conscious Inbox
                  </button>
                  .
                </>
              )}
            </p>
          )}
        </section>

        <section className="mt-16 mb-12 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-[#2d3748] bg-[#1a2029] p-8">
            <h3 className="mb-2 text-xl font-bold text-white">
              {locale === 'es' ? '¿Conoces un lugar Consciente?' : 'Know a Conscious place?'}
            </h3>
            <p className="mb-6 text-sm text-gray-400">
              {locale === 'es'
                ? 'Nomina un restaurante, bar, marca, artista o festival que merezca el sello. La comunidad decide.'
                : 'Nominate a restaurant, bar, brand, artist, or festival that deserves the seal. The community decides.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setNominateOpen(true)
                setNominateBanner(null)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              <Award className="h-5 w-5 shrink-0 text-white/90" aria-hidden />
              {locale === 'es' ? 'Nominar un lugar' : 'Nominate a place'}
            </button>
            <p className="mt-4 text-xs text-gray-500">
              {locale === 'es'
                ? 'Las nominaciones llegan a nuestro Buzón Consciente y son revisadas por el equipo.'
                : 'Nominations arrive in our Conscious Inbox and are reviewed by the team.'}
            </p>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {pendingSwipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="w-full max-w-md rounded-t-2xl border border-[#2d3748] bg-[#1a2029] p-6 shadow-2xl sm:rounded-2xl"
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
                1 ··· <span className="font-semibold text-white">{confidence}</span> ··· 10
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAliasModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-[#2d3748] bg-[#1a2029] p-6 shadow-2xl"
            >
              <h3 className="mb-2 text-lg font-bold text-white">{t.aliasTitle}</h3>
              <p className="mb-4 text-sm text-gray-400">{t.aliasBody}</p>
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder={t.aliasPlaceholder}
                maxLength={20}
                autoFocus
                className="mb-4 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
              />
              {voteError ? <p className="mb-3 text-center text-sm text-red-400">{voteError}</p> : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void joinAliasAndRetry(locale === 'es' ? 'Invitado' : 'Guest')}
                  className="flex-1 rounded-lg border border-[#2d3748] py-2.5 text-sm text-gray-400"
                >
                  {t.aliasGuest}
                </button>
                <button
                  type="button"
                  onClick={() => void joinAliasAndRetry(aliasInput)}
                  className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  {t.aliasConfirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {nominateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-end justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#2d3748] bg-[#1a2029] p-6 shadow-2xl sm:rounded-2xl"
            >
              <h3 className="mb-1 flex items-center gap-2 text-xl font-bold text-white">
                <Award className="h-6 w-6 shrink-0 text-emerald-400" aria-hidden />
                {t.nominateTitle}
              </h3>
              <p className="mb-6 text-sm text-gray-400">{t.nominateSub}</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    {locale === 'es' ? 'Nombre del lugar *' : 'Place name *'}
                  </label>
                  <input
                    value={nominateForm.name}
                    onChange={(e) => setNominateForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    {locale === 'es' ? 'Ubicación (colonia, ciudad) *' : 'Location (neighborhood, city) *'}
                  </label>
                  <input
                    value={nominateForm.location}
                    onChange={(e) => setNominateForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    {locale === 'es' ? '¿Por qué es Consciente? *' : 'Why is it Conscious? *'}
                  </label>
                  <textarea
                    value={nominateForm.why}
                    onChange={(e) => setNominateForm((p) => ({ ...p, why: e.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    Instagram ({locale === 'es' ? 'opcional' : 'optional'})
                  </label>
                  <input
                    value={nominateForm.instagram}
                    onChange={(e) => setNominateForm((p) => ({ ...p, instagram: e.target.value }))}
                    className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-300">
                    {locale === 'es' ? 'Tu email (para notificarte)' : 'Your email (to notify you)'}
                  </label>
                  <input
                    type="email"
                    value={nominateForm.submitter_email}
                    onChange={(e) => setNominateForm((p) => ({ ...p, submitter_email: e.target.value }))}
                    className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              {nominateBanner && nominateOpen ? (
                <p className="mt-4 text-center text-sm text-red-400">{nominateBanner}</p>
              ) : null}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNominateOpen(false)
                    setNominateBanner(null)
                  }}
                  className="flex-1 rounded-xl border border-[#2d3748] py-3 text-gray-400"
                >
                  {t.nominateCancel}
                </button>
                <button
                  type="button"
                  onClick={() => void submitNomination()}
                  disabled={nominateBusy}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {nominateBusy ? '…' : t.nominateSend}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnonVotePrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-[45] border-t border-[#2d3748] bg-[#1a2029] p-4 shadow-2xl md:p-5"
          >
            <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">{t.anonVoteTitle}</p>
                <p className="text-sm text-slate-400">{t.anonVoteBody}</p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Link
                  href="/signup"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500 sm:flex-none"
                >
                  {t.anonSignUp}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAnonVotePrompt(false)}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[#2d3748] px-4 text-slate-300 hover:bg-[#0f1419] sm:flex-none"
                >
                  {t.anonKeep}
                </button>
              </div>
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
