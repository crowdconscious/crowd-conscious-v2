'use client'

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  X,
  Link2,
  Plus,
  Sparkles,
} from 'lucide-react'
import { LogoUpload } from '@/components/ui/LogoUpload'
import { ImageUpload } from '@/components/ui/ImageUpload'
const CATEGORIES = [
  { id: 'pulse', label: 'Pulse' },
  { id: 'world_cup', label: 'World Cup' },
  { id: 'world', label: 'World' },
  { id: 'government', label: 'Government' },
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'sustainability', label: 'Sustainability' },
  { id: 'technology', label: 'Technology' },
  { id: 'economy', label: 'Economy' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'community', label: 'Community' },
  { id: 'cause', label: 'Cause' },
  { id: 'entertainment', label: 'Entertainment' },
] as const

/** Unified dark inputs (#1a2029 / #2d3748) */
const ccInput =
  'w-full px-4 py-2.5 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
const ccInputSm =
  'px-3 py-2 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
const ccSection = 'bg-[#1a2029] border border-[#2d3748] rounded-xl p-6'

// Map suggestion category (from News Monitor) to form category
const CATEGORY_MAP: Record<string, string> = {
  sports: 'world_cup',
  politics: 'government',
  economy: 'economy',
  culture: 'community',
  world: 'world',
  technology: 'technology',
}

type MarketOption = { id: string; title: string }

export default function CreateMarketPage() {
  const [fromInboxId, setFromInboxId] = useState<string | null>(null)
  const [suggestionId, setSuggestionId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [initialProbability, setInitialProbability] = useState(50)
  const [resolutionDate, setResolutionDate] = useState('')
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [marketType, setMarketType] = useState<'binary' | 'multi'>('binary')
  const [outcomes, setOutcomes] = useState<string[]>(['', ''])
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
  const [enResolutionCriteria, setEnResolutionCriteria] = useState('')

  const [isPulse, setIsPulse] = useState(false)
  const [pulseClientName, setPulseClientName] = useState('')
  const [pulseClientLogo, setPulseClientLogo] = useState('')
  const [pulseClientEmail, setPulseClientEmail] = useState('')
  const [pulseCoverUrl, setPulseCoverUrl] = useState('')
  const [successIsPulse, setSuccessIsPulse] = useState(false)
  const prevIsPulseRef = useRef(false)

  useEffect(() => {
    if (isPulse) {
      setCategory('pulse')
    } else if (prevIsPulseRef.current) {
      setCategory((c) => (c === 'pulse' ? 'world' : c))
    }
    prevIsPulseRef.current = isPulse
  }, [isPulse])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sourceSignals, setSourceSignals] = useState<string[]>([])
  const [suggestingCriteria, setSuggestingCriteria] = useState(false)

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
    const prefillCriteria =
      params.get('resolution_criteria') ?? params.get('resolution')
    const prefillCriteriaEn = params.get('resolution_criteria_en')
    const prefillDesc = params.get('description') ?? params.get('description_es')
    const prefillDescEn = params.get('description_en')
    const prefillProb = params.get('probability')
    const prefillEnd = params.get('end_date')
    const prefillTags = params.get('tags')
    const prefillOutcomes = params.get('outcomes')
    if (prefillTitle) setTitle(prefillTitle)
    if (prefillTitleEn) setEnTitle(prefillTitleEn)
    if (prefillCategory) setCategory(prefillCategory)
    if (prefillCriteria) setResolutionCriteria(prefillCriteria)
    if (prefillCriteriaEn) setEnResolutionCriteria(prefillCriteriaEn)
    if (prefillDesc) setDescription(prefillDesc)
    if (prefillDescEn) setEnDescription(prefillDescEn)
    if (prefillTags) setTagsInput(prefillTags)
    if (prefillProb) {
      const n = parseFloat(prefillProb)
      const pct = n > 0 && n <= 1 ? Math.round(n * 100) : Math.round(n)
      if (pct >= 1 && pct <= 99) setInitialProbability(pct)
    }
    if (prefillEnd) {
      const d = new Date(prefillEnd)
      if (!isNaN(d.getTime())) setResolutionDate(d.toISOString().slice(0, 16))
    }
    if (prefillOutcomes) {
      const parts = prefillOutcomes.split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        setMarketType('multi')
        setOutcomes(parts)
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
        setCategory(item.category || '')
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
        // Pre-fill ALL fields (News Monitor v2 format: title_es, description_es, etc.)
        const titleVal = String(sug.title_es ?? sug.title ?? item.title ?? '')
        const descVal = String(sug.description_es ?? sug.description ?? '')
        const catRaw = String(sug.category ?? '').toLowerCase()
        const mappedCat = catRaw ? (CATEGORY_MAP[catRaw] ?? catRaw) : ''
        const resCritVal = String(sug.resolution_criteria_es ?? sug.resolution_criteria ?? '')
        const initProb = Number(sug.initial_probability)
        const validProb = initProb >= 1 && initProb <= 99 ? initProb : 50

        setTitle(titleVal)
        setDescription(descVal)
        setCategory(mappedCat)
        setResolutionCriteria(resCritVal)
        setInitialProbability(validProb)

        // English translations
        setEnTitle(String(sug.title_en ?? ''))
        setEnDescription(String(sug.description_en ?? ''))
        setEnResolutionCriteria(String(sug.resolution_criteria_en ?? ''))

        // Tags
        const tags = sug.tags
        if (typeof tags === 'string') {
          setTagsInput(tags)
        } else if (Array.isArray(tags)) {
          setTagsInput((tags as string[]).join(', '))
        } else {
          setTagsInput('')
        }

        // Resolution date
        const resDate = sug.resolution_date
        if (resDate) {
          const d = new Date(String(resDate))
          if (!isNaN(d.getTime())) {
            setResolutionDate(d.toISOString().slice(0, 16))
          }
        }

        // Source signals (News Monitor v2)
        const signals = Array.isArray(sug.source_signals) ? (sug.source_signals as string[]) : []
        setSourceSignals(signals)

        // Legacy: source_urls → verification sources & links
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

  const addOutcome = () => setOutcomes((prev) => [...prev, ''])
  const removeOutcome = (i: number) =>
    setOutcomes((prev) => (prev.length > 2 ? prev.filter((_, j) => j !== i) : prev))
  const updateOutcome = (i: number, v: string) =>
    setOutcomes((prev) => prev.map((o, j) => (j === i ? v : o)))

  const addRelatedMarket = (id: string) => {
    if (!relatedMarketIds.includes(id)) {
      setRelatedMarketIds((prev) => [...prev, id])
      setRelatedSearch('')
      setRelatedOptions([])
    }
  }
  const removeRelatedMarket = (id: string) =>
    setRelatedMarketIds((prev) => prev.filter((x) => x !== id))

  const handleSuggestCriteria = async () => {
    if (!title.trim()) return
    setSuggestingCriteria(true)
    try {
      const res = await fetch('/api/predictions/admin/suggest-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.suggested) {
        setResolutionCriteria(data.suggested)
      } else {
        setError(data.error || 'Failed to suggest criteria')
      }
    } catch {
      setError('Failed to suggest criteria')
    } finally {
      setSuggestingCriteria(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!resolutionDate) {
      setError('Resolution date is required')
      return
    }
    if (marketType === 'multi' && outcomes.filter((o) => o.trim()).length < 2) {
      setError('Multi-choice requires at least 2 options')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/admin/create-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category: isPulse ? 'pulse' : category || 'world',
          initial_probability: initialProbability,
          resolution_date: new Date(resolutionDate).toISOString(),
          resolution_criteria: resolutionCriteria.trim() || null,
          market_type: marketType,
          outcomes: marketType === 'multi' ? outcomes.filter((o) => o.trim()) : undefined,
          verification_sources: verificationSources
            .filter((s) => s.name.trim())
            .map((s) => ({ name: s.name.trim(), url: s.url.trim() || undefined })),
          tags: tagsInput,
          links: links.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), label: l.label.trim() || l.url })),
          related_market_ids: relatedMarketIds,
          sponsor_name: sponsorName.trim() || null,
          sponsor_logo_url: sponsorLogoUrl.trim() || null,
          sponsorship_amount_mxn: sponsorshipAmountMxn ? Number(sponsorshipAmountMxn) : null,
          conscious_fund_percentage: consciousFundPercentage,
          translations:
            enTitle || enDescription || enResolutionCriteria
              ? {
                  en: {
                    ...(enTitle && { title: enTitle.trim() }),
                    ...(enDescription && { description: enDescription.trim() }),
                    ...(enResolutionCriteria && { resolution_criteria: enResolutionCriteria.trim() }),
                  },
                }
              : undefined,
          is_pulse: isPulse,
          pulse_client_name: isPulse ? pulseClientName.trim() || null : null,
          pulse_client_logo: isPulse ? pulseClientLogo.trim() || null : null,
          pulse_client_email: isPulse ? pulseClientEmail.trim() || null : null,
          ...(isPulse ? { cover_image_url: pulseCoverUrl.trim() || null } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create market')
      const marketId = data.market_id
      setSuccessIsPulse(isPulse)

      // Mark suggestion as used when created from suggestion_id
      if (suggestionId) {
        try {
          await fetch(`/api/predictions/admin/agent-content/${suggestionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: true, market_id: marketId }),
          })
        } catch {
          // Non-fatal: market was created
        }
      }

      setSuccessId(marketId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create market')
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
          <h2 className="text-xl font-bold text-emerald-400 mb-2">Market created successfully</h2>
          <p className="text-cc-text-secondary mb-6">Your prediction market is now live.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href={`/predictions/markets/${successId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
            >
              View market
            </Link>
            {successIsPulse && (
              <Link
                href={`/pulse/${successId}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/50 bg-emerald-950/50 text-emerald-200 font-medium hover:bg-emerald-900/40"
              >
                Pulse results page
              </Link>
            )}
            <Link
              href="/predictions/admin/create-market"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-200 font-medium hover:bg-gray-700 border border-cc-border"
            >
              Create another
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
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white">Create New Market</h1>
      <p className="text-cc-text-secondary">
        Manually create a new prediction market. All fields support the community voting system.
      </p>

      {fromInboxId && (
        <p className="text-sm text-emerald-400">
          Pre-filled from inbox submission. Edit as needed.
        </p>
      )}
      {suggestionId && !fromInboxId && (
        <div className="space-y-1">
          <p className="text-sm text-emerald-400">
            Pre-filled from News Monitor suggestion (title, description, resolution, English translation, tags). Edit as needed.
          </p>
          {sourceSignals.length > 0 && (
            <p className="text-xs text-cc-text-muted">
              Based on signals from: {sourceSignals.join(', ')}
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
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isPulse}
                onChange={(e) => setIsPulse(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span className="text-sm font-medium text-white">
                Conscious Pulse (B2B sentiment)
              </span>
            </label>
          </div>

          {isPulse && (
            <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-[#0f1419]/80 p-4">
              <h3 className="text-sm font-bold text-emerald-400">Pulse client info</h3>
              <input
                type="text"
                placeholder="Client name (e.g. Alcaldía Cuauhtémoc)"
                value={pulseClientName}
                onChange={(e) => setPulseClientName(e.target.value)}
                className={ccInput}
              />
              <LogoUpload
                currentLogoUrl={pulseClientLogo.trim() || null}
                onUpload={(u) => setPulseClientLogo(u)}
                onClear={() => setPulseClientLogo('')}
                label="Client logo"
                hint="PNG, JPG, WebP, GIF · máx. 2MB / max 2MB — or paste a URL below"
              />
              <div>
                <label className="mb-1 block text-xs text-cc-text-muted">
                  Or paste a public image URL
                </label>
                <input
                  type="url"
                  placeholder="https://…"
                  value={pulseClientLogo}
                  onChange={(e) => setPulseClientLogo(e.target.value)}
                  className={ccInput}
                />
              </div>
              <input
                type="email"
                placeholder="Client email"
                value={pulseClientEmail}
                onChange={(e) => setPulseClientEmail(e.target.value)}
                className={ccInput}
              />
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Pulse cover image
                </label>
                <ImageUpload
                  currentUrl={pulseCoverUrl.trim() || null}
                  onUpload={(url) => setPulseCoverUrl(url)}
                  onClear={() => setPulseCoverUrl('')}
                  storagePath="pulse"
                  label="Upload cover (or paste URL below)"
                  hint="PNG, JPG, WebP · máx. 2MB"
                />
                <input
                  type="url"
                  placeholder="https://… (optional URL instead of upload)"
                  value={pulseCoverUrl}
                  onChange={(e) => setPulseCoverUrl(e.target.value)}
                  className={`${ccInput} mt-2`}
                />
              </div>
            </div>
          )}

          {/* Basic info */}
          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Basic info</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ¿Bajará Banxico la tasa..."
                  required
                  className={ccInput}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Descripción del mercado
                </label>
                <p className="text-xs text-cc-text-muted mb-1.5">
                  Contexto y por qué es relevante. ¿Qué factores influyen?
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explica el contexto de este mercado. ¿Por qué es relevante? ¿Qué factores influyen?"
                  rows={4}
                  className={`${ccInput} resize-none`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={ccInput}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Initial probability (1–99)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={initialProbability}
                    onChange={(e) => setInitialProbability(Number(e.target.value))}
                    className="cc-range-slider flex-1 min-w-0"
                    style={
                      {
                        '--cc-range-pct': `${((initialProbability - 1) / 98) * 100}%`,
                      } as CSSProperties
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={initialProbability}
                    onChange={(e) =>
                      setInitialProbability(Math.min(99, Math.max(1, Number(e.target.value) || 50)))
                    }
                    className="w-16 shrink-0 px-2 py-1.5 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white text-sm text-center focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Resolution */}
          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Resolution</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Resolution date *
                </label>
                <input
                  type="datetime-local"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  required
                  className={`${ccInput} [color-scheme:dark]`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Criterio de resolución
                </label>
                <p className="text-xs text-cc-text-muted mb-1.5">
                  Condiciones específicas y verificables. Ejemplo: Resuelve SÍ si el tipo de cambio MXN/USD baja de 19.00 según Banxico antes del 31 de diciembre de 2026.
                </p>
                <div className="flex gap-2">
                  <textarea
                    value={resolutionCriteria}
                    onChange={(e) => setResolutionCriteria(e.target.value)}
                    placeholder="Define exactamente cómo se resuelve. Ejemplo: Resuelve SÍ si el tipo de cambio MXN/USD baja de 19.00 según datos de Banxico antes del 31 de diciembre de 2026."
                    rows={3}
                    className={`flex-1 ${ccInput} resize-none`}
                  />
                  <button
                    type="button"
                    onClick={handleSuggestCriteria}
                    disabled={suggestingCriteria || !title.trim()}
                    title="Generate AI suggestion from title and description"
                    className="shrink-0 self-start px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    {suggestingCriteria ? '...' : 'Suggest'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Market type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="marketType"
                      checked={marketType === 'binary'}
                      onChange={() => setMarketType('binary')}
                      className="text-emerald-600 accent-emerald-500"
                    />
                    <span className="text-gray-300">Yes/No</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="marketType"
                      checked={marketType === 'multi'}
                      onChange={() => setMarketType('multi')}
                      className="text-emerald-600 accent-emerald-500"
                    />
                    <span className="text-gray-300">Multiple choice</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* English Translation */}
          <details className="mt-6 border border-cc-border rounded-lg p-4 bg-cc-bg/80">
            <summary className="text-gray-300 cursor-pointer font-medium">
              🌐 English Translation (optional)
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-cc-text-secondary">English Title</label>
                <input
                  type="text"
                  value={enTitle}
                  onChange={(e) => setEnTitle(e.target.value)}
                  placeholder="English version of the market question"
                  className={`mt-1 ${ccInput}`}
                />
              </div>
              <div>
                <label className="block text-sm text-cc-text-secondary">English Description</label>
                <textarea
                  value={enDescription}
                  onChange={(e) => setEnDescription(e.target.value)}
                  placeholder="English description"
                  rows={3}
                  className={`mt-1 ${ccInput} resize-none`}
                />
              </div>
              <div>
                <label className="block text-sm text-cc-text-secondary">English Resolution Criteria</label>
                <textarea
                  value={enResolutionCriteria}
                  onChange={(e) => setEnResolutionCriteria(e.target.value)}
                  placeholder="English resolution criteria"
                  rows={2}
                  className={`mt-1 ${ccInput} resize-none`}
                />
              </div>
            </div>
          </details>

          {marketType === 'multi' && (
            <div className={ccSection}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Options</label>
                  <div className="space-y-2">
                    {outcomes.map((o, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={o}
                          onChange={(e) => updateOutcome(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className={`flex-1 ${ccInputSm}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOutcome(i)}
                          disabled={outcomes.length <= 2}
                          className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOutcome}
                      className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
                    >
                      <Plus className="w-4 h-4" />
                      Add option
                    </button>
                  </div>
                </div>
              )}

          {/* Verification */}
          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Verification</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Verification sources
                </label>
                <div className="space-y-2">
                  {verificationSources.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateVerificationSource(i, 'name', e.target.value)}
                        placeholder="Source name"
                        className={`flex-1 ${ccInputSm}`}
                      />
                      <input
                        type="url"
                        value={s.url}
                        onChange={(e) => updateVerificationSource(i, 'url', e.target.value)}
                        placeholder="URL (optional)"
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
                    Add source
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tags</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="economia, banxico, tasas"
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
            </div>
          </section>

          {/* Rich content */}
          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Rich content</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Links</label>
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
                        placeholder="Label"
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
                    Add link
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Related markets
                </label>
                <input
                  type="text"
                  value={relatedSearch}
                  onChange={(e) => setRelatedSearch(e.target.value)}
                  placeholder="Search markets..."
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

          {/* Sponsorship */}
          <section className={ccSection}>
            <h2 className="text-lg font-semibold text-white mb-4">Sponsorship</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Sponsor name
                </label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Optional"
                  className={ccInput}
                />
              </div>
              <LogoUpload
                currentLogoUrl={sponsorLogoUrl.trim() || null}
                onUpload={(u) => setSponsorLogoUrl(u)}
                onClear={() => setSponsorLogoUrl('')}
                label="Sponsor logo"
                hint="Upload or paste a URL in the field below after upload if needed."
              />
              <div>
                <label className="mb-1 block text-xs text-cc-text-muted">
                  Or paste sponsor logo URL
                </label>
                <input
                  type="url"
                  value={sponsorLogoUrl}
                  onChange={(e) => setSponsorLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className={ccInput}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Sponsorship amount (MXN)
                </label>
                <input
                  type="number"
                  min={0}
                  value={sponsorshipAmountMxn}
                  onChange={(e) => setSponsorshipAmountMxn(e.target.value)}
                  placeholder="Optional"
                  className={ccInput}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Conscious Fund allocation %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={consciousFundPercentage}
                  onChange={(e) =>
                    setConsciousFundPercentage(Math.min(100, Math.max(0, Number(e.target.value) || 20)))
                  }
                  className={ccInput}
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create market'}
          </button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <h3 className="text-sm font-medium text-cc-text-secondary">Preview</h3>
            {/* Card preview (markets list) */}
            <div className="pointer-events-none select-none">
              <p className="text-xs text-cc-text-muted mb-1">Card (markets list)</p>
              <div className="bg-cc-card border border-cc-border rounded-xl p-5 hover:border-emerald-500/30 transition-colors">
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 mb-3">
                  {CATEGORIES.find((c) => c.id === (category || 'world'))?.label || 'Category'}
                </span>
                <h3 className="text-white font-semibold line-clamp-2 mb-3 min-h-[2.5rem] text-base leading-snug">
                  {title || 'Market title'}
                </h3>
                {marketType === 'binary' ? (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="h-9 rounded-lg bg-gray-800/50 relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full rounded-lg bg-emerald-500/20"
                        style={{ width: `${initialProbability}%` }}
                      />
                      <div className="relative z-10 flex justify-between items-center px-3 h-full">
                        <span className="text-sm text-gray-200">YES</span>
                        <span className="text-sm font-semibold text-white">{initialProbability}%</span>
                      </div>
                    </div>
                    <div className="h-9 rounded-lg bg-gray-800/50 relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full rounded-lg bg-emerald-500/20"
                        style={{ width: `${100 - initialProbability}%` }}
                      />
                      <div className="relative z-10 flex justify-between items-center px-3 h-full">
                        <span className="text-sm text-gray-200">NO</span>
                        <span className="text-sm font-semibold text-white">{100 - initialProbability}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {outcomes
                      .map((o, i) => ({ o, i }))
                      .filter(({ o }) => o.trim())
                      .slice(0, 4)
                      .map(({ o, i }) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-sm text-gray-300 w-[100px] truncate">{o || `Option ${i + 1}`}</span>
                          <div className="flex-1 h-7 rounded bg-gray-800/50 relative overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full rounded bg-emerald-500/20"
                              style={{ width: `${Math.max(8, 100 / Math.max(2, outcomes.filter((x) => x.trim()).length))}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-white w-10 text-right">—</span>
                        </div>
                      ))}
                  </div>
                )}
                <div className="mt-3 text-xs text-gray-500">
                  {resolutionDate
                    ? `Resolves ${new Date(resolutionDate).toLocaleDateString()}`
                    : 'No resolution date'}
                </div>
              </div>
            </div>
            {/* Detail preview (description + resolution criteria) */}
            <div className="pointer-events-none select-none">
              <p className="text-xs text-cc-text-muted mb-1">Detail (description & criteria)</p>
              <div className="bg-cc-card border border-cc-border rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-cc-text-muted text-xs font-medium mb-1">Description</p>
                  <p className="text-white text-sm line-clamp-3">
                    {description || <span className="italic text-cc-text-muted">—</span>}
                  </p>
                </div>
                <div>
                  <p className="text-cc-text-muted text-xs font-medium mb-1">Resolution criteria</p>
                  <p className="text-white text-sm line-clamp-3">
                    {resolutionCriteria || <span className="italic text-cc-text-muted">—</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
