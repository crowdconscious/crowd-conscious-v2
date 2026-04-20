'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Copy, Check, Download, Eye, Sparkles, X } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { MetricTooltip } from '@/components/ui/MetricTooltip'
import { PulsePreviewCard } from '@/components/sponsor/PulsePreviewCard'
import { useSponsorT } from '@/lib/i18n/sponsor-dashboard'

type PulseAiSuggestion = {
  context: string
  options: string[]
  resolution_criteria: string
  suggested_duration_days: number
  improved_title?: string
}

const inputClass =
  'w-full bg-[#0f1419] border border-[#2d3748] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20'
const textareaClass =
  'w-full bg-[#0f1419] border border-[#2d3748] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 resize-y min-h-[80px] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20'
const dateClass =
  'w-full bg-[#0f1419] border border-[#2d3748] rounded-lg px-4 py-3 text-white [color-scheme:dark] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20'
const helpClass = 'text-gray-500 text-xs mt-1'

type Props = {
  token: string
  companyName: string
  initialLogoUrl: string | null
  /** Absolute origin of the app — `${NEXT_PUBLIC_APP_URL}` normalised. Used
   * for share links + QR rendering in the success modal. */
  appOrigin: string
}

type DraftShape = {
  title: string
  description: string
  resolutionCriteria: string
  resolutionDate: string
  options: string[]
  logoUrl: string
  coverImageUrl: string
  savedAt: string
}

const DRAFT_STALE_MS = 1000 * 60 * 60 * 24 * 14 // 14 days — past this we discard silently
const draftKeyFor = (token: string) => `sponsor_pulse_draft_${token.slice(0, 8)}`

function FieldLabel({
  label,
  tip,
  required,
  htmlFor,
}: {
  label: string
  tip?: string
  required?: boolean
  htmlFor?: string
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-300">
        {label}
        {required ? ' *' : ''}
      </label>
      {tip ? <MetricTooltip text={tip} label={label} /> : null}
    </div>
  )
}

export default function CreatePulseForm({
  token,
  companyName,
  initialLogoUrl,
  appOrigin,
}: Props) {
  const { t, language } = useSponsorT()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [resolutionDate, setResolutionDate] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [logoUrl, setLogoUrl] = useState(() => initialLogoUrl?.trim() || '')
  const [coverImageUrl, setCoverImageUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [marketId, setMarketId] = useState<string | null>(null)

  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<PulseAiSuggestion | null>(null)
  const [aiError, setAiError] = useState('')

  const [draftPrompt, setDraftPrompt] = useState<DraftShape | null>(null)
  const [draftIndicator, setDraftIndicator] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const formDirtyRef = useRef(false)

  const optionPlaceholders = useMemo(
    () => [
      t('create_form.field_options_placeholder_1'),
      t('create_form.field_options_placeholder_2'),
      t('create_form.field_options_placeholder_3'),
      t('create_form.field_options_placeholder_4'),
    ],
    [t]
  )

  const draftKey = useMemo(() => draftKeyFor(token), [token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(draftKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as DraftShape
      if (!parsed || typeof parsed !== 'object') return
      const savedAt = parsed.savedAt ? new Date(parsed.savedAt).getTime() : 0
      if (!savedAt || Date.now() - savedAt > DRAFT_STALE_MS) {
        window.localStorage.removeItem(draftKey)
        return
      }
      const hasContent =
        parsed.title?.trim() ||
        parsed.description?.trim() ||
        parsed.options?.some((o) => o?.trim())
      if (!hasContent) return
      setDraftPrompt(parsed)
    } catch {
      /* ignore corrupted draft */
    }
  }, [draftKey])

  useEffect(() => {
    formDirtyRef.current = Boolean(
      title.trim() ||
        description.trim() ||
        resolutionCriteria.trim() ||
        resolutionDate ||
        options.some((o) => o.trim()) ||
        coverImageUrl.trim()
    )
  }, [title, description, resolutionCriteria, resolutionDate, options, coverImageUrl])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (marketId) return
    if (draftPrompt) return
    const id = window.setInterval(() => {
      if (!formDirtyRef.current) return
      const payload: DraftShape = {
        title,
        description,
        resolutionCriteria,
        resolutionDate,
        options,
        logoUrl,
        coverImageUrl,
        savedAt: new Date().toISOString(),
      }
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(payload))
        setDraftIndicator(true)
        window.setTimeout(() => setDraftIndicator(false), 1500)
      } catch {
        /* localStorage disabled — ignore */
      }
    }, 10_000)
    return () => window.clearInterval(id)
  }, [
    title,
    description,
    resolutionCriteria,
    resolutionDate,
    options,
    logoUrl,
    coverImageUrl,
    draftKey,
    marketId,
    draftPrompt,
  ])

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(draftKey)
    } catch {
      /* ignore */
    }
  }, [draftKey])

  const applyDraft = useCallback(() => {
    if (!draftPrompt) return
    setTitle(draftPrompt.title ?? '')
    setDescription(draftPrompt.description ?? '')
    setResolutionCriteria(draftPrompt.resolutionCriteria ?? '')
    setResolutionDate(draftPrompt.resolutionDate ?? '')
    setOptions(
      Array.isArray(draftPrompt.options) && draftPrompt.options.length >= 2
        ? draftPrompt.options
        : ['', '']
    )
    if (draftPrompt.logoUrl) setLogoUrl(draftPrompt.logoUrl)
    if (draftPrompt.coverImageUrl) setCoverImageUrl(draftPrompt.coverImageUrl)
    setDraftPrompt(null)
  }, [draftPrompt])

  const discardDraft = useCallback(() => {
    clearDraft()
    setDraftPrompt(null)
  }, [clearDraft])

  const handleAIAssist = async () => {
    setAiError('')
    setAiLoading(true)
    try {
      const res = await fetch('/api/sponsor/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          token,
          companyName,
        }),
      })
      const data = (await res.json()) as PulseAiSuggestion & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error')
      if (data.context && Array.isArray(data.options) && data.options.length >= 2) {
        setAiSuggestion(data as PulseAiSuggestion)
      } else {
        setAiError(language === 'es' ? 'Respuesta incompleta. Intenta de nuevo.' : 'Incomplete response. Try again.')
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Error')
    } finally {
      setAiLoading(false)
    }
  }

  const applyAISuggestion = () => {
    if (!aiSuggestion) return
    if (aiSuggestion.context) setDescription(aiSuggestion.context)
    if (aiSuggestion.resolution_criteria) setResolutionCriteria(aiSuggestion.resolution_criteria)
    if (aiSuggestion.improved_title?.trim()) setTitle(aiSuggestion.improved_title.trim())
    if (aiSuggestion.options?.length) {
      const next = aiSuggestion.options.map((o) => o.trim()).filter(Boolean)
      if (next.length >= 2) setOptions(next.length <= 6 ? next : next.slice(0, 6))
    }
    if (aiSuggestion.suggested_duration_days) {
      const close = new Date()
      close.setDate(close.getDate() + aiSuggestion.suggested_duration_days)
      const pad = (n: number) => String(n).padStart(2, '0')
      const local = `${close.getFullYear()}-${pad(close.getMonth() + 1)}-${pad(close.getDate())}T${pad(close.getHours())}:${pad(close.getMinutes())}`
      setResolutionDate(local)
    }
    setAiSuggestion(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const outcomeLabels = options.map((s) => s.trim()).filter(Boolean)
    try {
      const res = await fetch(`/api/dashboard/sponsor/${encodeURIComponent(token)}/create-pulse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          resolution_criteria: resolutionCriteria.trim(),
          resolution_date: resolutionDate,
          outcomes: outcomeLabels,
          cover_image_url: coverImageUrl.trim() || null,
          sponsor_logo_url: logoUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setMarketId(data.market_id as string)
      clearDraft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const cleanOptionCount = options.filter((o) => o.trim()).length
  const previewReady = title.trim().length > 0 && cleanOptionCount >= 2

  if (marketId) {
    return (
      <PublishedSuccess
        marketId={marketId}
        token={token}
        title={title}
        appOrigin={appOrigin}
        onCreateAnother={() => {
          setMarketId(null)
          setTitle('')
          setDescription('')
          setResolutionCriteria('')
          setResolutionDate('')
          setOptions(['', ''])
          setCoverImageUrl('')
          setError('')
        }}
      />
    )
  }

  return (
    <>
      {draftPrompt ? (
        <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium text-white">{t('create_form.draft_found_title')}</p>
          <p className="mt-1 text-amber-200/90">
            {t('create_form.draft_found_body', {
              when: new Date(draftPrompt.savedAt).toLocaleString(
                language === 'es' ? 'es-MX' : 'en-US'
              ),
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyDraft}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              {t('create_form.draft_continue')}
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/10"
            >
              {t('create_form.draft_discard')}
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-8 space-y-6">
        {error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div>
          <FieldLabel
            label={t('create_form.field_title_label')}
            tip={t('create_form.field_title_tip')}
            required
            htmlFor="pulse-title"
          />
          <input
            id="pulse-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={t('create_form.field_title_placeholder')}
            className={inputClass}
          />
        </div>

        {title.trim().length > 10 ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">{t('create_form.ai_title')}</p>
                <p className="mt-0.5 text-xs text-gray-400">{t('create_form.ai_subtitle')}</p>
                {aiError ? <p className="mt-2 text-xs text-red-400">{aiError}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => void handleAIAssist()}
                disabled={aiLoading}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('create_form.ai_thinking')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> {t('create_form.ai_assistant')}
                  </>
                )}
              </button>
            </div>

            {aiSuggestion ? (
              <div className="mt-4 space-y-3 border-t border-emerald-500/10 pt-4">
                <div className="rounded-lg bg-[#0f1419] p-3">
                  <span className="text-xs text-gray-500">{t('create_form.ai_ctx')}</span>
                  <p className="mt-1 text-sm text-gray-300">{aiSuggestion.context}</p>
                </div>
                <div className="rounded-lg bg-[#0f1419] p-3">
                  <span className="text-xs text-gray-500">{t('create_form.ai_options')}</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aiSuggestion.options.map((opt, i) => (
                      <span
                        key={i}
                        className="rounded bg-emerald-500/10 px-2 py-1 text-sm text-emerald-400"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-[#0f1419] p-3">
                  <span className="text-xs text-gray-500">{t('create_form.ai_resolution')}</span>
                  <p className="mt-1 text-sm text-gray-300">{aiSuggestion.resolution_criteria}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyAISuggestion}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                  >
                    {t('create_form.ai_apply')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="rounded-lg border border-[#2d3748] px-4 py-2 text-sm text-gray-400 hover:bg-white/5"
                  >
                    {t('create_form.ai_discard')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <FieldLabel
            label={t('create_form.field_logo_label')}
            tip={t('create_form.field_logo_tip')}
          />
          <ImageUpload
            currentUrl={logoUrl.trim() || null}
            onUpload={(url) => setLogoUrl(url)}
            onClear={() => setLogoUrl('')}
            storagePath="sponsors"
            label={t('create_form.field_logo_upload_label')}
            hint={t('create_form.field_logo_upload_hint')}
          />
          <p className={helpClass}>{t('create_form.field_logo_help')}</p>
        </div>

        <div>
          <FieldLabel
            label={t('create_form.field_cover_label')}
            tip={t('create_form.field_cover_tip')}
          />
          <ImageUpload
            currentUrl={coverImageUrl.trim() || null}
            onUpload={(url) => setCoverImageUrl(url)}
            onClear={() => setCoverImageUrl('')}
            storagePath="pulse"
            label={t('create_form.field_cover_upload_label')}
            hint={t('create_form.field_cover_upload_hint')}
          />
          <p className={helpClass}>{t('create_form.field_cover_help')}</p>
        </div>

        <div>
          <FieldLabel
            label={t('create_form.field_context_label')}
            tip={t('create_form.field_context_tip')}
            htmlFor="pulse-context"
          />
          <textarea
            id="pulse-context"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={t('create_form.field_context_placeholder')}
            className={textareaClass}
          />
        </div>

        <div>
          <FieldLabel
            label={t('create_form.field_resolution_label')}
            tip={t('create_form.field_resolution_tip')}
            htmlFor="pulse-resolution"
          />
          <textarea
            id="pulse-resolution"
            value={resolutionCriteria}
            onChange={(e) => setResolutionCriteria(e.target.value)}
            rows={3}
            placeholder={t('create_form.field_resolution_placeholder')}
            className={textareaClass}
          />
        </div>

        <div>
          <FieldLabel
            label={t('create_form.field_close_label')}
            tip={t('create_form.field_close_tip')}
            required
            htmlFor="pulse-close"
          />
          <input
            id="pulse-close"
            type="datetime-local"
            value={resolutionDate}
            onChange={(e) => setResolutionDate(e.target.value)}
            required
            className={dateClass}
          />
        </div>

        <div>
          <FieldLabel
            label={t('create_form.field_options_label')}
            tip={t('create_form.field_options_tip')}
            required
          />
          <div className="space-y-2">
            {options.map((opt, i) => {
              const placeholder =
                optionPlaceholders[i] ??
                t('create_form.field_options_placeholder_n', { n: i + 1 })
              return (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options]
                      next[i] = e.target.value
                      setOptions(next)
                    }}
                    placeholder={placeholder}
                    className={`${inputClass} flex-1`}
                  />
                  {options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      className="shrink-0 px-2 text-gray-500 hover:text-red-400"
                      aria-label={t('create_form.field_options_remove')}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
          {options.length < 6 ? (
            <button
              type="button"
              onClick={() => setOptions([...options, ''])}
              className="mt-2 text-sm text-emerald-400 hover:underline"
            >
              {t('create_form.field_options_add')}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={!previewReady}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            {t('create_form.preview')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? t('create_form.submitting') : t('create_form.submit')}
          </button>
          {draftIndicator ? (
            <span className="text-xs text-slate-500">{t('create_form.draft_saved_indicator')}</span>
          ) : null}
        </div>
      </form>

      {previewOpen ? (
        <PreviewModal
          onClose={() => setPreviewOpen(false)}
          ready={previewReady}
          title={title}
          coverImageUrl={coverImageUrl || null}
          sponsorName={companyName}
          sponsorLogoUrl={logoUrl || null}
          options={options}
          resolutionDate={resolutionDate}
        />
      ) : null}
    </>
  )
}

function PreviewModal({
  onClose,
  ready,
  title,
  coverImageUrl,
  sponsorName,
  sponsorLogoUrl,
  options,
  resolutionDate,
}: {
  onClose: () => void
  ready: boolean
  title: string
  coverImageUrl: string | null
  sponsorName: string
  sponsorLogoUrl: string | null
  options: string[]
  resolutionDate: string
}) {
  const { t, language } = useSponsorT()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#2d3748] bg-[#0f1419] sm:rounded-2xl"
        style={{ maxHeight: 'min(90vh, 100dvh)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#2d3748] px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-white">{t('create_form.preview')}</h3>
            <p className="text-xs text-slate-500">{t('create_form.preview_subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label={t('create_form.preview_close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {ready ? (
            <PulsePreviewCard
              title={title}
              coverImageUrl={coverImageUrl}
              sponsorName={sponsorName}
              sponsorLogoUrl={sponsorLogoUrl}
              options={options}
              resolutionDate={resolutionDate}
              language={language}
            />
          ) : (
            <p className="text-sm text-slate-400">{t('create_form.preview_empty')}</p>
          )}
        </div>
        <div className="shrink-0 border-t border-[#2d3748] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {t('create_form.preview_close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function PublishedSuccess({
  marketId,
  token,
  title,
  appOrigin,
  onCreateAnother,
}: {
  marketId: string
  token: string
  title: string
  appOrigin: string
  onCreateAnother: () => void
}) {
  const { t, language } = useSponsorT()
  const [copied, setCopied] = useState(false)

  const publicUrl = `${appOrigin}/pulse/${marketId}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(publicUrl)}`

  const shareBody =
    language === 'es'
      ? `Acabamos de lanzar este Pulse: ${title.trim()}. Vota y cuéntame qué piensas → ${publicUrl}`
      : `We just launched this Pulse: ${title.trim()}. Vote and share your thoughts → ${publicUrl}`

  const waHref = `https://wa.me/?text=${encodeURIComponent(shareBody)}`
  const liHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareBody)}`

  const copyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">{t('create_form.published_title')}</h3>
        </div>

        <div className="mt-5 rounded-lg border border-[#2d3748] bg-[#0f1419]/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('create_form.published_next_steps')}
          </p>

          <div className="mt-3 space-y-4">
            <div>
              <p className="text-sm text-slate-300">{t('create_form.published_copy_link')}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={publicUrl}
                  className="flex-1 rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-200"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> {t('create_form.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> {t('create_form.copy_link')}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-300">{t('create_form.published_download_qr')}</p>
              <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt="QR"
                  width={120}
                  height={120}
                  className="h-28 w-28 rounded border border-[#2d3748] bg-white p-2"
                />
                <a
                  href={qrSrc}
                  download={`pulse-${marketId}.png`}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
                >
                  <Download className="h-4 w-4" /> {t('create_form.download')}
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-300">{t('create_form.published_publish_channels')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {t('create_form.whatsapp')}
                </a>
                <a
                  href={liHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#0A66C2] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {t('create_form.linkedin')}
                </a>
                <a
                  href={xHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {t('create_form.twitter')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/sponsor/${token}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {t('create_form.published_go_dashboard')}
          </Link>
          <button
            type="button"
            onClick={onCreateAnother}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            {t('create_form.published_create_another')}
          </button>
          <Link
            href={`/predictions/markets/${marketId}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            {t('create_form.success_view_market')}
          </Link>
        </div>
      </div>
    </div>
  )
}
