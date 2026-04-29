'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { LogoUpload } from '@/components/ui/LogoUpload'
import { MARKET_CATEGORY_IDS } from '@/lib/market-categories'
import type { Json } from '@/types/database'

const ccInput =
  'w-full px-4 py-2.5 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
const ccSection = 'bg-[#1a2029] border border-[#2d3748] rounded-xl p-6'

type MarketRow = {
  id: string
  title: string
  description: string | null
  /** Migration 215. */
  description_short?: string | null
  resolution_criteria: string | null
  resolution_date: string
  category: string
  tags: string[] | null
  translations: Json | null
  cover_image_url: string | null
  sponsor_name: string | null
  sponsor_logo_url: string | null
  sponsor_url: string | null
  sponsor_account_id: string | null
  conscious_fund_percentage: number | null
  is_pulse: boolean | null
  pulse_client_name: string | null
  pulse_client_logo: string | null
  pulse_client_email: string | null
  verification_sources: string[] | null
}

type OutcomeRow = { id: string; label: string; subtitle?: string | null }

const OUTCOME_TITLE_MAX = 80
const OUTCOME_SUBTITLE_MAX = 200
const DESCRIPTION_SHORT_MAX = 280

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 16)
}

export default function EditMarketForm({
  market,
  outcomes: initialOutcomes,
  sponsorAccounts = [],
}: {
  market: MarketRow
  outcomes: OutcomeRow[]
  sponsorAccounts?: { id: string; company_name: string; tier: string }[]
}) {
  const router = useRouter()
  const tr = market.translations as {
    en?: {
      title?: string
      description?: string
      description_short?: string
      resolution_criteria?: string
    }
  } | null

  const [title, setTitle] = useState(market.title)
  const [titleEn, setTitleEn] = useState(tr?.en?.title ?? '')
  const [description, setDescription] = useState(market.description ?? '')
  const [descriptionEn, setDescriptionEn] = useState(tr?.en?.description ?? '')
  // Migration 215. Required client-side for new Pulses; on the edit form we
  // allow saving without it so legacy markets aren't blocked.
  const [descriptionShort, setDescriptionShort] = useState(
    market.description_short ?? ''
  )
  const [descriptionShortEn, setDescriptionShortEn] = useState(
    tr?.en?.description_short ?? ''
  )
  const [resolutionCriteria, setResolutionCriteria] = useState(market.resolution_criteria ?? '')
  const [resolutionCriteriaEn, setResolutionCriteriaEn] = useState(tr?.en?.resolution_criteria ?? '')
  const [category, setCategory] = useState(market.category)
  const [tagsInput, setTagsInput] = useState((market.tags ?? []).join(', '))
  const [resolutionDate, setResolutionDate] = useState(toDatetimeLocal(market.resolution_date))
  const [verificationText, setVerificationText] = useState(
    (market.verification_sources ?? []).join('\n')
  )
  const [coverUrl, setCoverUrl] = useState(market.cover_image_url ?? '')
  const [sponsorName, setSponsorName] = useState(market.sponsor_name ?? '')
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState(market.sponsor_logo_url ?? '')
  const [sponsorUrl, setSponsorUrl] = useState(market.sponsor_url ?? '')
  const [sponsorAccountId, setSponsorAccountId] = useState(market.sponsor_account_id ?? '')
  const [fundPct, setFundPct] = useState(
    Number.isFinite(Number(market.conscious_fund_percentage))
      ? Number(market.conscious_fund_percentage)
      : 20
  )
  const [pulseClientName, setPulseClientName] = useState(market.pulse_client_name ?? '')
  const [pulseClientLogo, setPulseClientLogo] = useState(market.pulse_client_logo ?? '')
  const [pulseClientEmail, setPulseClientEmail] = useState(market.pulse_client_email ?? '')
  const [outcomeLabels, setOutcomeLabels] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const o of initialOutcomes) m[o.id] = o.label
    return m
  })
  const [outcomeSubtitles, setOutcomeSubtitles] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const o of initialOutcomes) m[o.id] = (o.subtitle ?? '').toString()
    return m
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isPulse = market.is_pulse === true

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const translations: {
        en: {
          title?: string
          description?: string
          description_short?: string
          resolution_criteria?: string
        }
      } = { en: {} }
      if (titleEn.trim()) translations.en.title = titleEn.trim()
      if (descriptionEn.trim()) translations.en.description = descriptionEn.trim()
      if (descriptionShortEn.trim())
        translations.en.description_short = descriptionShortEn
          .trim()
          .slice(0, DESCRIPTION_SHORT_MAX)
      if (resolutionCriteriaEn.trim()) translations.en.resolution_criteria = resolutionCriteriaEn.trim()

      const outcomesPayload = initialOutcomes.map((o) => {
        const sub = (outcomeSubtitles[o.id] ?? '').trim()
        return {
          id: o.id,
          label: (outcomeLabels[o.id] ?? o.label).trim(),
          // Send null on clear so the API knows to wipe the column rather
          // than leave it untouched. Empty string is treated as "no subtitle".
          subtitle: sub ? sub.slice(0, OUTCOME_SUBTITLE_MAX) : null,
        }
      })

      const res = await fetch(`/api/predictions/admin/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          description_short: descriptionShort.trim().slice(0, DESCRIPTION_SHORT_MAX) || null,
          resolution_criteria: resolutionCriteria.trim() || null,
          resolution_date: new Date(resolutionDate).toISOString(),
          category,
          tags: tagsInput,
          translations,
          verification_sources: verificationText,
          cover_image_url: coverUrl.trim() || null,
          sponsor_name: sponsorName.trim() || null,
          sponsor_logo_url: sponsorLogoUrl.trim() || null,
          sponsor_url: sponsorUrl.trim() || null,
          sponsor_account_id: sponsorAccountId || null,
          conscious_fund_percentage: Number.isFinite(fundPct)
            ? Math.round(Math.min(100, Math.max(0, fundPct)))
            : 20,
          pulse_client_name: isPulse ? pulseClientName.trim() || null : undefined,
          pulse_client_logo: isPulse ? pulseClientLogo.trim() || null : undefined,
          pulse_client_email: isPulse ? pulseClientEmail.trim() || null : undefined,
          outcomes: outcomesPayload,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      router.push(`/predictions/markets/${market.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <Link
        href={`/predictions/markets/${market.id}`}
        className="inline-flex items-center gap-2 text-sm text-cc-text-secondary hover:text-emerald-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to market
      </Link>

      <h1 className="text-2xl font-bold text-white">Edit market</h1>
      <p className="text-cc-text-secondary text-sm">
        Update copy, dates, images, and outcome labels. Outcome options cannot be added or removed.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-300 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className={ccSection}>
          <h2 className="mb-4 text-lg font-semibold text-white">Basic info</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Title (ES) *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required className={ccInput} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Title (EN)</label>
              <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={ccInput} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Descripción corta (ES)
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
              <p className="mb-1.5 text-xs text-cc-text-muted">
                2 frases máximo. Lo primero que verán los votantes. Estilo: claro,
                sin jargon.
              </p>
              <textarea
                value={descriptionShort}
                onChange={(e) =>
                  setDescriptionShort(
                    e.target.value.slice(0, DESCRIPTION_SHORT_MAX)
                  )
                }
                rows={3}
                maxLength={DESCRIPTION_SHORT_MAX}
                className={`${ccInput} resize-none`}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Descripción corta (EN)
                </label>
                <span
                  className={`text-[10px] tabular-nums ${
                    descriptionShortEn.length > DESCRIPTION_SHORT_MAX
                      ? 'text-red-400'
                      : descriptionShortEn.length > DESCRIPTION_SHORT_MAX - 30
                        ? 'text-amber-400'
                        : 'text-gray-500'
                  }`}
                >
                  {descriptionShortEn.length}/{DESCRIPTION_SHORT_MAX}
                </span>
              </div>
              <textarea
                value={descriptionShortEn}
                onChange={(e) =>
                  setDescriptionShortEn(
                    e.target.value.slice(0, DESCRIPTION_SHORT_MAX)
                  )
                }
                rows={2}
                maxLength={DESCRIPTION_SHORT_MAX}
                className={`${ccInput} resize-none`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Description (ES)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={`${ccInput} resize-none`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Description (EN)</label>
              <textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                rows={4}
                className={`${ccInput} resize-none`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required className={ccInput}>
                {MARKET_CATEGORY_IDS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Tags</label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tag1, tag2"
                className={ccInput}
              />
            </div>
          </div>
        </section>

        <section className={ccSection}>
          <h2 className="mb-4 text-lg font-semibold text-white">Dates & resolution</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Resolution / end date *</label>
              <input
                type="datetime-local"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                required
                className={ccInput}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Resolution criteria (ES)</label>
              <textarea
                value={resolutionCriteria}
                onChange={(e) => setResolutionCriteria(e.target.value)}
                rows={3}
                className={`${ccInput} resize-none`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Resolution criteria (EN)</label>
              <textarea
                value={resolutionCriteriaEn}
                onChange={(e) => setResolutionCriteriaEn(e.target.value)}
                rows={3}
                className={`${ccInput} resize-none`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Verification sources (one per line)
              </label>
              <textarea
                value={verificationText}
                onChange={(e) => setVerificationText(e.target.value)}
                rows={4}
                className={`${ccInput} resize-none font-mono text-sm`}
              />
            </div>
          </div>
        </section>

        <section className={ccSection}>
          <h2 className="mb-4 text-lg font-semibold text-white">Media</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Cover image</label>
              <ImageUpload
                currentUrl={coverUrl.trim() || null}
                onUpload={(url) => setCoverUrl(url)}
                onClear={() => setCoverUrl('')}
                storagePath="pulse"
                label="Upload cover"
                hint="PNG, JPG, WebP · or paste URL below"
              />
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://…"
                className={`${ccInput} mt-2`}
              />
            </div>
          </div>
        </section>

        <section className={ccSection}>
          <h2 className="mb-4 text-lg font-semibold text-white">Sponsorship</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Sponsor account</label>
              <select
                value={sponsorAccountId}
                onChange={(e) => setSponsorAccountId(e.target.value)}
                className={ccInput}
              >
                <option value="">No linked account</option>
                {sponsorAccounts.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {sa.company_name} ({sa.tier})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Links this market to the sponsor dashboard (token URL). Optional if you only use sponsor name.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Sponsor name</label>
              <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} className={ccInput} />
            </div>
            <div className="rounded-xl border border-[#2d3748] bg-[#0f1419]/50 p-4">
              <LogoUpload
                currentLogoUrl={sponsorLogoUrl.trim() || null}
                onUpload={(u) => setSponsorLogoUrl(u)}
                onClear={() => setSponsorLogoUrl('')}
                label="Sponsor logo"
                hint="Upload or paste URL below"
              />
              <input
                type="url"
                value={sponsorLogoUrl}
                onChange={(e) => setSponsorLogoUrl(e.target.value)}
                className={`${ccInput} mt-2`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Sponsor URL</label>
              <input type="url" value={sponsorUrl} onChange={(e) => setSponsorUrl(e.target.value)} className={ccInput} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Conscious Fund %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={Number.isFinite(fundPct) ? fundPct : 20}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') {
                    setFundPct(20)
                    return
                  }
                  const n = Number(v)
                  if (Number.isFinite(n)) setFundPct(n)
                }}
                className={ccInput}
              />
            </div>
          </div>
        </section>

        {isPulse && (
          <section className={ccSection}>
            <h2 className="mb-4 text-lg font-semibold text-emerald-400">Pulse client</h2>
            <p className="mb-4 text-xs text-gray-500">Conscious Pulse is enabled for this market (read-only).</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Client name</label>
                <input value={pulseClientName} onChange={(e) => setPulseClientName(e.target.value)} className={ccInput} />
              </div>
              <div className="rounded-xl border border-[#2d3748] bg-[#0f1419]/50 p-4">
                <LogoUpload
                  currentLogoUrl={pulseClientLogo.trim() || null}
                  onUpload={(u) => setPulseClientLogo(u)}
                  onClear={() => setPulseClientLogo('')}
                  label="Client logo"
                  hint="Upload or paste URL"
                />
                <input
                  type="url"
                  value={pulseClientLogo}
                  onChange={(e) => setPulseClientLogo(e.target.value)}
                  className={`${ccInput} mt-2`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Client email</label>
                <input
                  type="email"
                  value={pulseClientEmail}
                  onChange={(e) => setPulseClientEmail(e.target.value)}
                  className={ccInput}
                />
              </div>
            </div>
          </section>
        )}

        <section className={ccSection}>
          <h2 className="mb-1 text-lg font-semibold text-white">Outcomes (título + subtítulo)</h2>
          <p className="mb-4 text-xs text-gray-500">
            Escribe sólo el título corto en la primera línea. Si necesitas dar
            contexto, ponlo en el subtítulo opcional. No metas la traducción al
            inglés ni paréntesis dentro del título — eso rompe la presentación.
          </p>
          <ul className="space-y-5">
            {initialOutcomes.map((o) => {
              const titleVal = outcomeLabels[o.id] ?? o.label
              const subVal = outcomeSubtitles[o.id] ?? ''
              return (
                <li key={o.id} className="rounded-lg border border-[#2d3748] bg-[#0f1419]/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      {o.id.slice(0, 8)}…
                    </span>
                    {subVal.length > 0 && (
                      <span
                        className={`text-[10px] tabular-nums ${
                          subVal.length > OUTCOME_SUBTITLE_MAX
                            ? 'text-red-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {subVal.length}/{OUTCOME_SUBTITLE_MAX}
                      </span>
                    )}
                  </div>

                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Título <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={titleVal}
                    onChange={(e) =>
                      setOutcomeLabels((prev) => ({
                        ...prev,
                        [o.id]: e.target.value.slice(0, OUTCOME_TITLE_MAX),
                      }))
                    }
                    maxLength={OUTCOME_TITLE_MAX}
                    required
                    className={ccInput}
                  />

                  <label className="mb-1 mt-3 block text-xs font-medium text-gray-400">
                    Subtítulo <span className="text-gray-600">(opcional)</span>
                  </label>
                  <input
                    value={subVal}
                    onChange={(e) =>
                      setOutcomeSubtitles((prev) => ({
                        ...prev,
                        [o.id]: e.target.value.slice(0, OUTCOME_SUBTITLE_MAX),
                      }))
                    }
                    maxLength={OUTCOME_SUBTITLE_MAX}
                    placeholder="Detalle breve, ej. 'Policía de proximidad, videovigilancia'"
                    className={ccInput}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Aparece debajo del título en la página del Pulse y en el panel
                    de votación.
                  </p>

                  {/* Inline preview so the admin can see what voters will see. */}
                  <div className="mt-3 rounded-md border border-white/5 bg-black/30 px-3 py-2">
                    <p className="text-sm font-medium text-white">{titleVal || 'Título'}</p>
                    {subVal.trim() ? (
                      <p className="mt-1 text-sm leading-snug text-gray-400">{subVal}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link
            href={`/predictions/markets/${market.id}`}
            className="rounded-xl border border-[#2d3748] px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
