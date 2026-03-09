'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  X,
  Link2,
  Plus,
} from 'lucide-react'
const CATEGORIES = [
  { id: 'world_cup', label: 'World Cup' },
  { id: 'world', label: 'World' },
  { id: 'government', label: 'Government' },
  { id: 'sustainability', label: 'Sustainability' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'community', label: 'Community' },
  { id: 'cause', label: 'Cause' },
] as const

type MarketOption = { id: string; title: string }

export default function CreateMarketPage() {
  const [fromInboxId, setFromInboxId] = useState<string | null>(null)
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
  const [consciousFundPercentage, setConsciousFundPercentage] = useState(7.5)
  const [enTitle, setEnTitle] = useState('')
  const [enDescription, setEnDescription] = useState('')
  const [enResolutionCriteria, setEnResolutionCriteria] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const id = params.get('from_inbox')
    if (id) {
      setFromInboxId(id)
      return
    }
    const prefillTitle = params.get('title')
    const prefillCategory = params.get('category')
    const prefillCriteria = params.get('resolution_criteria')
    if (prefillTitle) setTitle(prefillTitle)
    if (prefillCategory) setCategory(prefillCategory)
    if (prefillCriteria) setResolutionCriteria(prefillCriteria)
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

  useEffect(() => {
    if (fromInboxId) loadInboxItem(fromInboxId)
  }, [fromInboxId, loadInboxItem])

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
          category: category || 'world',
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create market')
      setSuccessId(data.market_id)
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
          <p className="text-slate-300 mb-6">Your prediction market is now live.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href={`/predictions/markets/${successId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
            >
              View market
            </Link>
            <Link
              href="/predictions/admin/create-market"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 font-medium hover:bg-slate-600"
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
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white">Create New Market</h1>
      <p className="text-slate-400">
        Manually create a new prediction market. All fields support the community voting system.
      </p>

      {fromInboxId && (
        <p className="text-sm text-emerald-400">
          Pre-filled from inbox submission. Edit as needed.
        </p>
      )}

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic info</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ¿Bajará Banxico la tasa..."
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Context about the issue"
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Initial probability (1–99)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={initialProbability}
                    onChange={(e) => setInitialProbability(Number(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={initialProbability}
                    onChange={(e) =>
                      setInitialProbability(Math.min(99, Math.max(1, Number(e.target.value) || 50)))
                    }
                    className="w-16 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Resolution */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Resolution</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Resolution date *
                </label>
                <input
                  type="datetime-local"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Resolution criteria
                </label>
                <textarea
                  value={resolutionCriteria}
                  onChange={(e) => setResolutionCriteria(e.target.value)}
                  placeholder="How this market gets resolved"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Market type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="marketType"
                      checked={marketType === 'binary'}
                      onChange={() => setMarketType('binary')}
                      className="text-emerald-600"
                    />
                    <span className="text-slate-300">Yes/No</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="marketType"
                      checked={marketType === 'multi'}
                      onChange={() => setMarketType('multi')}
                      className="text-emerald-600"
                    />
                    <span className="text-slate-300">Multiple choice</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* English Translation */}
          <details className="mt-6 border border-slate-700 rounded-lg p-4 bg-slate-900/50">
            <summary className="text-slate-300 cursor-pointer font-medium">
              🌐 English Translation (optional)
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-400">English Title</label>
                <input
                  type="text"
                  value={enTitle}
                  onChange={(e) => setEnTitle(e.target.value)}
                  placeholder="English version of the market question"
                  className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400">English Description</label>
                <textarea
                  value={enDescription}
                  onChange={(e) => setEnDescription(e.target.value)}
                  placeholder="English description"
                  rows={3}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400">English Resolution Criteria</label>
                <textarea
                  value={enResolutionCriteria}
                  onChange={(e) => setEnResolutionCriteria(e.target.value)}
                  placeholder="English resolution criteria"
                  rows={2}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
          </details>

          {marketType === 'multi' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Options</label>
                  <div className="space-y-2">
                    {outcomes.map((o, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={o}
                          onChange={(e) => updateOutcome(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeOutcome(i)}
                          disabled={outcomes.length <= 2}
                          className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-50"
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
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Verification</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                      <input
                        type="url"
                        value={s.url}
                        onChange={(e) => updateVerificationSource(i, 'url', e.target.value)}
                        placeholder="URL (optional)"
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeVerificationSource(i)}
                        className="p-2 text-slate-400 hover:text-red-400"
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Tags</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="economia, banxico, tasas"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
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
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Rich content</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Links</label>
                <div className="space-y-2">
                  {links.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="url"
                        value={l.url}
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                      <input
                        type="text"
                        value={l.label}
                        onChange={(e) => updateLink(i, 'label', e.target.value)}
                        placeholder="Label"
                        className="w-28 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(i)}
                        className="p-2 text-slate-400 hover:text-red-400"
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Related markets
                </label>
                <input
                  type="text"
                  value={relatedSearch}
                  onChange={(e) => setRelatedSearch(e.target.value)}
                  placeholder="Search markets..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                />
                {relatedOptions.length > 0 && (
                  <div className="border border-slate-700 rounded-lg overflow-hidden">
                    {relatedOptions.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => addRelatedMarket(m.id)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
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
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
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
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Sponsorship</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Sponsor name
                </label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Sponsor logo URL
                </label>
                <input
                  type="url"
                  value={sponsorLogoUrl}
                  onChange={(e) => setSponsorLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Sponsorship amount (MXN)
                </label>
                <input
                  type="number"
                  min={0}
                  value={sponsorshipAmountMxn}
                  onChange={(e) => setSponsorshipAmountMxn(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Conscious Fund allocation %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={consciousFundPercentage}
                  onChange={(e) =>
                    setConsciousFundPercentage(Math.min(100, Math.max(0, Number(e.target.value) || 7.5)))
                  }
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <div className="sticky top-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Preview</h3>
            <div className="pointer-events-none select-none [&_a]:pointer-events-none">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-300 mb-3`}
                >
                  {CATEGORIES.find((c) => c.id === (category || 'world'))?.label || 'Category'}
                </span>
                <h3 className="text-white font-semibold line-clamp-2 mb-4 min-h-[2.5rem]">
                  {title || 'Market title'}
                </h3>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-white">
                    {marketType === 'binary'
                      ? `${initialProbability}%`
                      : outcomes[0] || 'Option 1'}
                  </span>
                  {marketType === 'binary' && (
                    <span className="text-slate-400 text-sm ml-2">YES</span>
                  )}
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full rounded-l-full"
                    style={{ width: `${initialProbability}%` }}
                  />
                  <div
                    className="bg-red-500/60 h-full rounded-r-full"
                    style={{ width: `${100 - initialProbability}%` }}
                  />
                </div>
                <div className="mt-4 text-sm text-slate-400">
                  {resolutionDate
                    ? `Resolves ${new Date(resolutionDate).toLocaleDateString()}`
                    : 'No resolution date'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
