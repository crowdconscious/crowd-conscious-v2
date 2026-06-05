'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, X, Link2, Plus } from 'lucide-react'
import { LogoUpload } from '@/components/ui/LogoUpload'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { PULSE_FORM_CATEGORIES, getPulseCategoryLabel } from '@/lib/market-categories'

const ccInput =
  'w-full px-4 py-2.5 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
const ccInputSm =
  'px-3 py-2 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
const ccSection = 'bg-[#1a2029] border border-[#2d3748] rounded-xl p-6'

const CATEGORY_MAP: Record<string, string> = {
  sports: 'community',
  politics: 'government',
  economy: 'economy',
  culture: 'community',
  world: 'world',
  technology: 'technology',
}

type MarketOption = { id: string; title: string }

type OutcomeDraft = {
  title: string
  subtitle: string
  titleEn: string
  subtitleEn: string
}

const EMPTY_OUTCOME = (): OutcomeDraft => ({
  title: '',
  subtitle: '',
  titleEn: '',
  subtitleEn: '',
})

export default function CreatePulsePage() {
  const [fromInboxId, setFromInboxId] = useState<string | null>(null)
  const [suggestionId, setSuggestionId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [descriptionShort, setDescriptionShort] = useState('')
  const DESCRIPTION_SHORT_MAX = 280
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('community')
  const [outcomes, setOutcomes] = useState<OutcomeDraft[]>([EMPTY_OUTCOME(), EMPTY_OUTCOME()])
  const OUTCOME_TITLE_MAX = 80
  const OUTCOME_SUBTITLE_MAX = 200
  const [verificationSources, setVerificationSources] = useState<{ name: string; url: string }[]>([
    { name: '', url: '' },
  ])
  const [tagsInput, setTagsInput] = useState('')
  const [links, setLinks] = useState<{ url: string; label: string }[]>([{ url: '', label: '' }])
  const [relatedMarketIds, setRelatedMarketIds] = useState<string[]>([])
  const [relatedSearch, setRelatedSearch] = useState('')
  const [relatedOptions, setRelatedOptions] = useState<MarketOption[]>([])
  const [sponsorName, setSponsorName] = useState('')
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('')
  const [sponsorshipAmountMxn, setSponsorshipAmountMxn] = useState('')
  const [consciousFundPercentage, setConsciousFundPercentage] = useState(20)
  const [enTitle, setEnTitle] = useState('')
  const [enDescription, setEnDescription] = useState('')
  const [enDescriptionShort, setEnDescriptionShort] = useState('')

  const [pulseClientName, setPulseClientName] = useState('')
  const [pulseClientLogo, setPulseClientLogo] = useState('')
  const [pulseClientEmail, setPulseClientEmail] = useState('')
  const [pulseCoverUrl, setPulseCoverUrl] = useState('')

  type SponsorOption = {
    id: string
    company_name: string
    contact_email: string
    contact_name: string | null
    logo_url: string | null
    status: string | null
  }
  const [sponsorAccountId, setSponsorAccountId] = useState<string>('')
  const [sponsorOptions, setSponsorOptions] = useState<SponsorOption[]>([])
  const [sponsorOptionsLoading, setSponsorOptionsLoading] = useState(false)
  const [sponsorOptionsError, setSponsorOptionsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setSponsorOptionsLoading(true)
      setSponsorOptionsError(null)
      try {
        const res = await fetch('/api/admin/sponsor-accounts', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load sponsors')
        if (!cancelled) {
          const rows = (data.accounts ?? []) as Array<SponsorOption & { pulse_count?: number }>
          setSponsorOptions(
            rows
              .filter((r) => (r.status ?? 'active') !== 'cancelled')
              .map((r) => ({
                id: r.id,
                company_name: r.company_name,
                contact_email: r.contact_email,
                contact_name: r.contact_name ?? null,
                logo_url: r.logo_url ?? null,
                status: r.status ?? 'active',
              }))
          )
        }
      } catch (e) {
        if (!cancelled) {
          setSponsorOptionsError(e instanceof Error ? e.message : 'Failed to load sponsors')
        }
      } finally {
        if (!cancelled) setSponsorOptionsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSponsorAccountChange = useCallback(
    (id: string) => {
      setSponsorAccountId(id)
      if (!id) return
      const acct = sponsorOptions.find((o) => o.id === id)
      if (!acct) return
      setPulseClientName((cur) => cur.trim() || acct.company_name)
      setPulseClientEmail((cur) => cur.trim() || acct.contact_email)
      setPulseClientLogo((cur) => cur.trim() || acct.logo_url || '')
      setSponsorName((cur) => cur.trim() || acct.company_name)
      setSponsorLogoUrl((cur) => cur.trim() || acct.logo_url || '')
    },
    [sponsorOptions]
  )

  const router = useRouter()
  const [submitting, setSubmitting] = useState<false | 'draft' | 'published'>(false)
  const [error, setError] = useState('')
  const [sourceSignals, setSourceSignals] = useState<string[]>([])

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const inboxId = params.get('from_inbox')
    const sugId = params.get('suggestion_id')
    if (inboxId) {
      setFromInboxId(inboxId)
      return
    }
    if (sugId) {
      setSuggestionId(sugId)
      return
    }
    const prefillTitle = params.get('title')
    const prefillTitleEn = params.get('title_en')
    const prefillCategory = params.get('category')
    const prefillDesc = params.get('description') ?? params.get('description_es')
    const prefillDescEn = params.get('description_en')
    const prefillDescShort =
      params.get('description_short') ?? params.get('description_short_es')
    const prefillDescShortEn = params.get('description_short_en')
    const prefillTags = params.get('tags')
    const prefillOutcomes = params.get('outcomes')
    if (prefillTitle) setTitle(prefillTitle)
    if (prefillTitleEn) setEnTitle(prefillTitleEn)
    if (prefillCategory) {
      const mapped = CATEGORY_MAP[prefillCategory.toLowerCase()] ?? prefillCategory
      if (PULSE_FORM_CATEGORIES.some((c) => c.id === mapped)) setCategory(mapped)
    }
    if (prefillDesc) setDescription(prefillDesc)
    if (prefillDescEn) setEnDescription(prefillDescEn)
    if (prefillDescShort) setDescriptionShort(prefillDescShort.slice(0, 280))
    if (prefillDescShortEn) setEnDescriptionShort(prefillDescShortEn.slice(0, 280))
    if (prefillTags) setTagsInput(prefillTags)
    if (prefillOutcomes) {
      const parts = prefillOutcomes.split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        setOutcomes(parts.map((t) => ({ ...EMPTY_OUTCOME(), title: t })))
      }
    }
  }, [])

  const loadInboxItem = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/predictions/admin/inbox/${id}`)
      const data = await res.json()
      if (res.ok && data.item) {
        const item = data.item
        setTitle(item.title || '')
        setDescription(item.description || '')
        const cat = item.category || ''
        if (PULSE_FORM_CATEGORIES.some((c) => c.id === cat)) setCategory(cat)
        setLinks(
          Array.isArray(item.links) && item.links.length > 0
            ? item.links.map((l: { url: string; label: string }) => ({
                url: l.url || '',
                label: l.label || '',
              }))
            : [{ url: '', label: '' }]
        )
      }
    } catch {
      // ignore
    }
  }, [])

  const loadSuggestion = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/predictions/admin/agent-content/${id}`)
      const data = await res.json()
      if (res.ok && data.item) {
        const item = data.item
        let sug: Record<string, unknown> = {}
        try {
          sug = typeof item.body === 'string' ? JSON.parse(item.body) : (item.body || {})
        } catch {
          sug = { title: item.title }
        }
        const titleVal = String(sug.title_es ?? sug.title ?? item.title ?? '')
        const descVal = String(sug.description_es ?? sug.description ?? '')
        const catRaw = String(sug.category ?? '').toLowerCase()
        const mappedCat = catRaw ? (CATEGORY_MAP[catRaw] ?? catRaw) : 'community'
        setTitle(titleVal)
        setDescription(descVal)
        if (PULSE_FORM_CATEGORIES.some((c) => c.id === mappedCat)) setCategory(mappedCat)

        const descShortVal = String(
          sug.description_short_es ?? sug.description_short ?? ''
        ).slice(0, 280)
        if (descShortVal) setDescriptionShort(descShortVal)

        setEnTitle(String(sug.title_en ?? ''))
        setEnDescription(String(sug.description_en ?? ''))
        setEnDescriptionShort(String(sug.description_short_en ?? '').slice(0, 280))

        const tags = sug.tags
        if (typeof tags === 'string') setTagsInput(tags)
        else if (Array.isArray(tags)) setTagsInput((tags as string[]).join(', '))

        const signals = Array.isArray(sug.source_signals) ? (sug.source_signals as string[]) : []
        setSourceSignals(signals)

        const sourceUrls = Array.isArray(sug.source_urls)
          ? (sug.source_urls as Array<{ url?: string; label?: string }>)
          : []
        if (sourceUrls.length > 0) {
          setVerificationSources(
            sourceUrls.map((s) => ({
              name: String(s.label || s.url || 'Source'),
              url: String(s.url || ''),
            }))
          )
          setLinks(
            sourceUrls.map((s) => ({
              url: String(s.url || ''),
              label: String(s.label || s.url || ''),
            }))
          )
        }
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (fromInboxId) loadInboxItem(fromInboxId)
  }, [fromInboxId, loadInboxItem])

  useEffect(() => {
    if (suggestionId) loadSuggestion(suggestionId)
  }, [suggestionId, loadSuggestion])

  useEffect(() => {
    if (!relatedSearch.trim()) {
      setRelatedOptions([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/predictions/markets?search=${encodeURIComponent(relatedSearch)}&limit=10`
        )
        const data = await res.json()
        const markets = (data.markets || []) as MarketOption[]
        setRelatedOptions(markets.filter((m) => !relatedMarketIds.includes(m.id)))
      } catch {
        setRelatedOptions([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [relatedSearch, relatedMarketIds])

  const addVerificationSource = () =>
    setVerificationSources((prev) => [...prev, { name: '', url: '' }])
  const removeVerificationSource = (i: number) =>
    setVerificationSources((prev) => prev.filter((_, j) => j !== i))
  const updateVerificationSource = (i: number, field: 'name' | 'url', v: string) =>
    setVerificationSources((prev) =>
      prev.map((s, j) => (j === i ? { ...s, [field]: v } : s))
    )

  const addLink = () => setLinks((prev) => [...prev, { url: '', label: '' }])
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, j) => j !== i))
  const updateLink = (i: number, field: 'url' | 'label', v: string) =>
    setLinks((prev) => prev.map((l, j) => (j === i ? { ...l, [field]: v } : l)))

  const addOutcome = () => setOutcomes((prev) => [...prev, EMPTY_OUTCOME()])
  const removeOutcome = (i: number) =>
    setOutcomes((prev) => (prev.length > 2 ? prev.filter((_, j) => j !== i) : prev))
  const updateOutcome = (i: number, field: keyof OutcomeDraft, v: string) =>
    setOutcomes((prev) =>
      prev.map((o, j) => {
        if (j !== i) return o
        if (field === 'title') return { ...o, title: v.slice(0, OUTCOME_TITLE_MAX) }
        if (field === 'subtitle') return { ...o, subtitle: v.slice(0, OUTCOME_SUBTITLE_MAX) }
        if (field === 'titleEn') return { ...o, titleEn: v.slice(0, OUTCOME_TITLE_MAX) }
        return { ...o, subtitleEn: v.slice(0, OUTCOME_SUBTITLE_MAX) }
      })
    )

  const addRelatedMarket = (id: string) => {
    if (!relatedMarketIds.includes(id)) {
      setRelatedMarketIds((prev) => [...prev, id])
      setRelatedSearch('')
      setRelatedOptions([])
    }
  }
  const removeRelatedMarket = (id: string) =>
    setRelatedMarketIds((prev) => prev.filter((x) => x !== id))

  const handleSubmit = async (
    e: React.FormEvent | React.MouseEvent,
    mode: 'draft' | 'published' = 'published'
  ) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }
    if (!descriptionShort.trim()) {
      setError('La descripción corta es obligatoria (2 frases máximo).')
      return
    }
    if (descriptionShort.length > DESCRIPTION_SHORT_MAX) {
      setError(`La descripción corta no puede exceder ${DESCRIPTION_SHORT_MAX} caracteres.`)
      return
    }
    if (outcomes.filter((o) => o.title.trim()).length < 2) {
      setError('Se requieren al menos 2 opciones de comunidad')
      return
    }

    setSubmitting(mode)
    try {
      const res = await fetch('/api/predictions/admin/create-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_draft: mode === 'draft',
          title: title.trim(),
          description: description.trim() || null,
          description_short: descriptionShort.trim(),
          category: category || 'community',
          outcomes: outcomes
            .filter((o) => o.title.trim())
            .map((o) => ({
              title: o.title.trim(),
              subtitle: o.subtitle.trim() || null,
              labelEn: o.titleEn.trim() || null,
              subtitleEn: o.subtitleEn.trim() || null,
            })),
          verification_sources: verificationSources
            .filter((s) => s.name.trim())
            .map((s) => ({ name: s.name.trim(), url: s.url.trim() || undefined })),
          tags: tagsInput,
          links: links
            .filter((l) => l.url.trim())
            .map((l) => ({ url: l.url.trim(), label: l.label.trim() || l.url })),
          related_market_ids: relatedMarketIds,
          sponsor_name: sponsorName.trim() || null,
          sponsor_logo_url: sponsorLogoUrl.trim() || null,
          sponsorship_amount_mxn: sponsorshipAmountMxn ? Number(sponsorshipAmountMxn) : null,
          conscious_fund_percentage: consciousFundPercentage,
          translations:
            enTitle || enDescription || enDescriptionShort
              ? {
                  en: {
                    ...(enTitle && { title: enTitle.trim() }),
                    ...(enDescription && { description: enDescription.trim() }),
                    ...(enDescriptionShort && {
                      description_short: enDescriptionShort.trim(),
                    }),
                  },
                }
              : undefined,
          pulse_client_name: pulseClientName.trim() || null,
          pulse_client_logo: pulseClientLogo.trim() || null,
          pulse_client_email: pulseClientEmail.trim() || null,
          sponsor_account_id: sponsorAccountId || null,
          cover_image_url: pulseCoverUrl.trim() || sponsorLogoUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create pulse')
      const marketId = data.market_id

      if (suggestionId) {
        try {
          await fetch(`/api/predictions/admin/agent-content/${suggestionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: true, market_id: marketId }),
          })
        } catch {
          // non-fatal
        }
      }

      if (mode === 'draft') {
        router.push(`/pulse/${marketId}?draft=created`)
        return
      }

      setSuccessId(marketId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pulse')
    } finally {
      setSubmitting(false)
    }
  }

  const tags = tagsInput
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-emerald-400 mb-2">Pulse publicado</h2>
          <p className="text-cc-text-secondary mb-6">
            Tu consulta de sentimiento público ya está activa para la comunidad.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href={`/pulse/${successId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
            >
              Ver Pulse
            </Link>
            <Link
              href="/predictions/admin/create-market"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-200 font-medium hover:bg-gray-700 border border-cc-border"
            >
              Crear otro
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-cc-text-secondary hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al panel
      </Link>

      <h1 className="text-2xl font-bold text-white">Crear Pulse</h1>
      <p className="text-cc-text-secondary">
        Consulta de sentimiento público: pregunta, contexto y opciones para que la comunidad vote
        con nivel de certeza.
      </p>

      {fromInboxId && (
        <p className="text-sm text-emerald-400">Prellenado desde inbox. Edita lo que necesites.</p>
      )}
      {suggestionId && !fromInboxId && (
        <div className="space-y-1">
          <p className="text-sm text-emerald-400">
            Prellenado desde sugerencia del News Monitor. Edita lo que necesites.
          </p>
          {sourceSignals.length > 0 && (
            <p className="text-xs text-cc-text-muted">
              Basado en señales de: {sourceSignals.join(', ')}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-[#0f1419]/80 p-4">
            <h3 className="text-sm font-bold text-emerald-400">Cliente / patrocinador</h3>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Sponsor account (vincula al dashboard del cliente)
              </label>
              <select
                value={sponsorAccountId}
                onChange={(e) => handleSponsorAccountChange(e.target.value)}
                className={ccInput}
                disabled={sponsorOptionsLoading}
              >
                <option value="">
                  {sponsorOptionsLoading
                    ? 'Cargando sponsors…'
                    : '— Sin sponsor account vinculado —'}
                </option>
                {sponsorOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name} · {s.contact_email}
                    {s.status && s.status !== 'active' ? ` (${s.status})` : ''}
                  </option>
                ))}
              </select>
              {sponsorOptionsError ? (
                <p className="mt-1 text-xs text-red-400">{sponsorOptionsError}</p>
              ) : (
                <p className="mt-1 text-xs text-cc-text-muted">
                  Al seleccionar un sponsor account se vincula el Pulse a su dashboard.{' '}
                  <Link
                    href="/admin/sponsors"
                    className="text-emerald-400 underline hover:text-emerald-300"
                    target="_blank"
                  >
                    Crear sponsor account
                  </Link>
                  .
                </p>
              )}
            </div>
            <input
              type="text"
              placeholder="Nombre del cliente (ej. Alcaldía Cuauhtémoc)"
              value={pulseClientName}
              onChange={(e) => setPulseClientName(e.target.value)}
              className={ccInput}
            />
            <LogoUpload
              currentLogoUrl={pulseClientLogo.trim() || null}
              onUpload={(u) => setPulseClientLogo(u)}
              onClear={() => setPulseClientLogo('')}
              label="Logo del cliente"
              hint="PNG, JPG, WebP, GIF · máx. 2MB"
            />
            <input
              type="email"
              placeholder="Email del cliente"
              value={pulseClientEmail}
              onChange={(e) => setPulseClientEmail(e.target.value)}
              className={ccInput}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Imagen de portada
              </label>
              <ImageUpload
                currentUrl={pulseCoverUrl.trim() || null}
                onUpload={(url) => setPulseCoverUrl(url)}
                onClear={() => setPulseCoverUrl('')}
                storagePath="pulse"
                label="Subir portada"
                hint="PNG, JPG, WebP · máx. 2MB"
              />
            </div>
          </div>

          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Pregunta y contexto</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Pregunta / título *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. ¿Cuál debería ser la prioridad #1 del presupuesto?"
                  required
                  className={ccInput}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Descripción corta <span className="text-red-400">*</span>
                  </label>
                  <span
                    className={`text-[10px] tabular-nums ${
                      descriptionShort.length > DESCRIPTION_SHORT_MAX
                        ? 'text-red-400'
                        : descriptionShort.length > DESCRIPTION_SHORT_MAX - 30
                          ? 'text-amber-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {descriptionShort.length}/{DESCRIPTION_SHORT_MAX}
                  </span>
                </div>
                <p className="text-xs text-cc-text-muted mb-1.5">
                  2 frases máximo. Lo primero que verán los votantes antes del panel de voto.
                </p>
                <textarea
                  value={descriptionShort}
                  onChange={(e) =>
                    setDescriptionShort(e.target.value.slice(0, DESCRIPTION_SHORT_MAX))
                  }
                  placeholder="Ej. La comunidad decide cómo priorizar el próximo presupuesto. Tu voto guía dónde se aplican los recursos."
                  rows={3}
                  maxLength={DESCRIPTION_SHORT_MAX}
                  className={`${ccInput} resize-none`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Contexto ampliado
                </label>
                <p className="text-xs text-cc-text-muted mb-1.5">
                  Antecedentes y por qué importa esta pregunta para la comunidad.
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explica el contexto. ¿Qué está en juego? ¿Qué factores influyen?"
                  rows={4}
                  className={`${ccInput} resize-none`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Tema / categoría *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={ccInput}
                  required
                >
                  {PULSE_FORM_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.labelEs}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className={ccSection}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-white">Opciones de comunidad *</h2>
              <p className="mt-1 text-xs text-cc-text-muted">
                Mínimo 2 opciones mutuamente excluyentes. Título en español + traducción opcional
                en inglés.
              </p>
            </div>
            <div className="space-y-4">
              {outcomes.map((o, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#2d3748] bg-[#0f1419]/60 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      Opción {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOutcome(i)}
                      disabled={outcomes.length <= 2}
                      className="p-1 text-gray-400 hover:text-red-400 disabled:opacity-50"
                      title="Quitar opción"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Título (ES) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={o.title}
                    onChange={(e) => updateOutcome(i, 'title', e.target.value)}
                    placeholder="Ej. Seguridad pública"
                    maxLength={OUTCOME_TITLE_MAX}
                    className={`w-full ${ccInputSm}`}
                  />
                  <label className="mb-1 mt-3 block text-xs font-medium text-gray-400">
                    Título (EN) <span className="text-gray-600">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={o.titleEn}
                    onChange={(e) => updateOutcome(i, 'titleEn', e.target.value)}
                    placeholder="e.g. Public safety"
                    maxLength={OUTCOME_TITLE_MAX}
                    className={`w-full ${ccInputSm}`}
                  />
                  <label className="mb-1 mt-3 block text-xs font-medium text-gray-400">
                    Subtítulo (ES) <span className="text-gray-600">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={o.subtitle}
                    onChange={(e) => updateOutcome(i, 'subtitle', e.target.value)}
                    placeholder="Detalle breve"
                    maxLength={OUTCOME_SUBTITLE_MAX}
                    className={`w-full ${ccInputSm}`}
                  />
                  <label className="mb-1 mt-3 block text-xs font-medium text-gray-400">
                    Subtítulo (EN) <span className="text-gray-600">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={o.subtitleEn}
                    onChange={(e) => updateOutcome(i, 'subtitleEn', e.target.value)}
                    placeholder="Brief detail"
                    maxLength={OUTCOME_SUBTITLE_MAX}
                    className={`w-full ${ccInputSm}`}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addOutcome}
                className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-4 h-4" />
                Agregar opción
              </button>
            </div>
          </section>

          <details className="border border-cc-border rounded-lg p-4 bg-cc-bg/80">
            <summary className="text-gray-300 cursor-pointer font-medium">
              Traducción al inglés (opcional)
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-cc-text-secondary">Título en inglés</label>
                <input
                  type="text"
                  value={enTitle}
                  onChange={(e) => setEnTitle(e.target.value)}
                  className={`mt-1 ${ccInput}`}
                />
              </div>
              <div>
                <label className="block text-sm text-cc-text-secondary">
                  Descripción corta en inglés
                </label>
                <textarea
                  value={enDescriptionShort}
                  onChange={(e) =>
                    setEnDescriptionShort(e.target.value.slice(0, DESCRIPTION_SHORT_MAX))
                  }
                  rows={2}
                  maxLength={DESCRIPTION_SHORT_MAX}
                  className={`mt-1 ${ccInput} resize-none`}
                />
              </div>
              <div>
                <label className="block text-sm text-cc-text-secondary">Contexto en inglés</label>
                <textarea
                  value={enDescription}
                  onChange={(e) => setEnDescription(e.target.value)}
                  rows={3}
                  className={`mt-1 ${ccInput} resize-none`}
                />
              </div>
            </div>
          </details>

          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Relevancia y fuentes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Etiquetas de relevancia
                </label>
                <p className="text-xs text-cc-text-muted mb-1.5">
                  Palabras clave que ayudan a descubrir y filtrar este Pulse (ej. presupuesto,
                  movilidad, clima).
                </p>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="presupuesto, movilidad, participación"
                  className={ccInput}
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-cc-border/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Fuentes de verificación
                </label>
                <div className="space-y-2">
                  {verificationSources.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateVerificationSource(i, 'name', e.target.value)}
                        placeholder="Nombre de la fuente"
                        className={`flex-1 ${ccInputSm}`}
                      />
                      <input
                        type="url"
                        value={s.url}
                        onChange={(e) => updateVerificationSource(i, 'url', e.target.value)}
                        placeholder="URL (opcional)"
                        className={`flex-1 ${ccInputSm}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeVerificationSource(i)}
                        className="p-2 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addVerificationSource}
                    className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar fuente
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Contenido adicional</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Enlaces</label>
                <div className="space-y-2">
                  {links.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="url"
                        value={l.url}
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        placeholder="https://..."
                        className={`flex-1 ${ccInputSm}`}
                      />
                      <input
                        type="text"
                        value={l.label}
                        onChange={(e) => updateLink(i, 'label', e.target.value)}
                        placeholder="Etiqueta"
                        className={`w-28 ${ccInputSm}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(i)}
                        className="p-2 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLink}
                    className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    <Link2 className="w-4 h-4" />
                    Agregar enlace
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Pulses relacionados
                </label>
                <input
                  type="text"
                  value={relatedSearch}
                  onChange={(e) => setRelatedSearch(e.target.value)}
                  placeholder="Buscar pulses..."
                  className={`${ccInput} mb-2`}
                />
                {relatedOptions.length > 0 && (
                  <div className="border border-cc-border rounded-lg overflow-hidden">
                    {relatedOptions.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => addRelatedMarket(m.id)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-cc-card-hover"
                      >
                        {m.title.slice(0, 60)}...
                      </button>
                    ))}
                  </div>
                )}
                {relatedMarketIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {relatedMarketIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 border border-cc-border rounded text-xs text-gray-300"
                      >
                        {id.slice(0, 8)}...
                        <button
                          type="button"
                          onClick={() => removeRelatedMarket(id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Patrocinio</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                placeholder="Nombre del patrocinador (opcional)"
                className={ccInput}
              />
              <LogoUpload
                currentLogoUrl={sponsorLogoUrl.trim() || null}
                onUpload={(u) => setSponsorLogoUrl(u)}
                onClear={() => setSponsorLogoUrl('')}
                label="Logo del patrocinador"
              />
              <input
                type="number"
                min={0}
                value={sponsorshipAmountMxn}
                onChange={(e) => setSponsorshipAmountMxn(e.target.value)}
                placeholder="Monto de patrocinio (MXN, opcional)"
                className={ccInput}
              />
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={consciousFundPercentage}
                onChange={(e) =>
                  setConsciousFundPercentage(
                    Math.min(100, Math.max(0, Number(e.target.value) || 20))
                  )
                }
                placeholder="Porcentaje al Conscious Fund"
                className={ccInput}
              />
            </div>
          </section>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={!!submitting}
              className="flex-1 px-6 py-3 border-2 border-emerald-500 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/10 transition disabled:opacity-50"
            >
              {submitting === 'draft' ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'published')}
              disabled={!!submitting}
              className="flex-1 px-6 py-3 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting === 'published' ? 'Publicando...' : 'Publicar Pulse'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <h3 className="text-sm font-medium text-cc-text-secondary">Vista previa</h3>
            <div className="pointer-events-none select-none bg-cc-card border border-cc-border rounded-xl p-5">
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 mb-3">
                {getPulseCategoryLabel(category, 'es')}
              </span>
              <h3 className="text-white font-semibold line-clamp-2 mb-3 text-base leading-snug">
                {title || 'Pregunta del Pulse'}
              </h3>
              <p className="text-sm text-gray-300 mb-3 line-clamp-3">
                {descriptionShort.trim() || (
                  <span className="italic text-cc-text-muted">Descripción corta</span>
                )}
              </p>
              <div className="flex flex-col gap-1.5">
                {outcomes
                  .filter((o) => o.title.trim())
                  .slice(0, 4)
                  .map((o, i) => (
                    <div key={i} className="text-sm text-gray-400 truncate">
                      · {o.title}
                    </div>
                  ))}
              </div>
              <p className="mt-3 text-xs text-emerald-400">Votar con certeza →</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
