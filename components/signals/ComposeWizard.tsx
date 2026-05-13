'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getCitizenSignalsCopy,
  SIGNAL_CATEGORIES,
  SIGNAL_POST_TYPES,
  SIGNAL_SEVERITIES,
  SIGNAL_TARGET_KINDS,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalPostType,
  type SignalSeverity,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'

export type ComposeTarget = {
  id: string
  slug: string
  display_name: string
  target_kind: string
}

export type ComposeLocation = {
  id: string
  slug: string
  name: string
  neighborhood: string | null
  city: string | null
}

type Props = {
  locale: CitizenSignalsLocale
  targets: ComposeTarget[]
  locations: ComposeLocation[]
  userDefaultLanguage: CitizenSignalsLocale
}

type EvidenceItem =
  | { kind: 'image' | 'pdf'; storage_path: string; caption: string }
  | { kind: 'link'; external_url: string; caption: string }

type Step = 0 | 1 | 2 | 3 | 4 | 5

export default function ComposeWizard({
  locale,
  targets,
  locations,
  userDefaultLanguage,
}: Props) {
  const router = useRouter()
  const t = getCitizenSignalsCopy(locale)

  const [step, setStep] = useState<Step>(0)

  // Step 0 — type + category + severity
  const [postType, setPostType] = useState<SignalPostType>('complaint')
  const [category, setCategory] = useState<SignalCategory>('environment')
  const [severity, setSeverity] = useState<SignalSeverity>('medium')

  // Step 1 — target
  const [targetKind, setTargetKind] = useState<SignalTargetKind>('municipality')
  const [targetId, setTargetId] = useState<string>('')

  // Step 2 — location
  const [locationId, setLocationId] = useState<string>('')

  // Step 3 — narrative
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [language, setLanguage] = useState<CitizenSignalsLocale>(userDefaultLanguage)
  const [anonymousMode, setAnonymousMode] = useState(false)
  const [aliasName, setAliasName] = useState('')

  // Step 4 — evidence
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)

  // Step 5 — legal + submit
  const [attestation, setAttestation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const filteredTargets = useMemo(
    () => targets.filter((target) => target.target_kind === targetKind),
    [targets, targetKind]
  )

  const canAdvance = (() => {
    switch (step) {
      case 0:
        return !!postType && !!category && !!severity
      case 1:
        return !!targetKind && !!targetId
      case 2:
        return !!locationId
      case 3:
        return (
          title.trim().length >= 8 &&
          body.trim().length >= 20 &&
          (!anonymousMode || aliasName.trim().length >= 2)
        )
      case 4:
        return true // evidence is optional in MVP for non-critical signals
      case 5:
        return attestation
      default:
        return false
    }
  })()

  const next = () => setStep((s) => (s < 5 ? ((s + 1) as Step) : s))
  const prev = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))

  const onFile = async (file: File) => {
    setUploading(true)
    setEvidenceError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/signals/upload', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as {
        storage_path: string
        kind: 'image' | 'pdf'
      }
      setEvidence((prev) => [
        ...prev,
        { kind: j.kind, storage_path: j.storage_path, caption: '' },
      ])
    } catch (e: unknown) {
      setEvidenceError((e as Error).message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onLinkAdd = (url: string) => {
    if (!url) return
    setEvidence((prev) => [...prev, { kind: 'link', external_url: url, caption: '' }])
  }

  const submit = async () => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const payload = {
        post_type: postType,
        category,
        severity,
        target_kind: targetKind,
        citizen_target_id: targetId,
        title: title.trim(),
        body: body.trim(),
        language,
        conscious_location_id: locationId,
        anonymous_display_mode: anonymousMode,
        anonymous_display_name: anonymousMode ? aliasName.trim() : null,
        evidence: evidence.map((ev) =>
          ev.kind === 'link'
            ? {
                kind: 'link',
                external_url: ev.external_url,
                caption: ev.caption || null,
              }
            : {
                kind: ev.kind,
                storage_path: ev.storage_path,
                caption: ev.caption || null,
              }
        ),
      }
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      router.push('/signals/nueva/listo')
    } catch (e: unknown) {
      setSubmitError((e as Error).message ?? 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const stepLabels = [
    t.compose.steps.type,
    t.compose.steps.target,
    t.compose.steps.location,
    t.compose.steps.narrative,
    t.compose.steps.evidence,
    t.compose.steps.review,
  ]

  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-5 sm:p-7">
      <ol
        aria-label={locale === 'es' ? 'Pasos' : 'Steps'}
        className="mb-6 flex flex-wrap items-center gap-3 text-xs"
        aria-live="polite"
      >
        {stepLabels.map((label, idx) => (
          <li
            key={label}
            className={`flex items-center gap-2 ${
              idx === step ? 'text-emerald-300' : idx < step ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${
                idx === step
                  ? 'border-emerald-400 bg-emerald-500/15'
                  : idx < step
                    ? 'border-slate-500 bg-slate-500/15'
                    : 'border-[#2d3748]'
              }`}
            >
              {idx + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-white">
              {t.compose.steps.type}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {SIGNAL_POST_TYPES.map((pt) => {
                const choice = t.compose.typeChoices[pt]
                return (
                  <label
                    key={pt}
                    className={`block cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                      postType === pt
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-[#2d3748] hover:border-emerald-400/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="post_type"
                      value={pt}
                      className="sr-only"
                      checked={postType === pt}
                      onChange={() => setPostType(pt)}
                    />
                    <div className="text-sm font-semibold text-white">
                      {choice.label}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{choice.help}</div>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white">
              {t.feed.filters.category}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SignalCategory)}
              className="mt-2 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100"
            >
              {SIGNAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.categoryLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white">
              {t.compose.narrative.severityLabel}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIGNAL_SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    severity === s
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                      : 'border-[#2d3748] text-slate-400 hover:border-emerald-400/60'
                  }`}
                >
                  {t.severityLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-5">
          <p className="text-sm text-slate-400">{t.compose.targetIntro}</p>
          <div>
            <label className="block text-sm font-semibold text-white">
              {t.feed.filters.target}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIGNAL_TARGET_KINDS.map((tk) => (
                <button
                  key={tk}
                  type="button"
                  onClick={() => {
                    setTargetKind(tk)
                    setTargetId('')
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    targetKind === tk
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                      : 'border-[#2d3748] text-slate-400 hover:border-emerald-400/60'
                  }`}
                >
                  {t.targetKindLabel(tk)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white">
              {t.detail.target}
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100"
            >
              <option value="">—</option>
              {filteredTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.display_name}
                </option>
              ))}
            </select>
            {filteredTargets.length === 0 && (
              <p className="mt-2 text-xs text-amber-300">
                {locale === 'es'
                  ? 'No hay destinatarios todavía para esta categoría.'
                  : 'No targets in this category yet.'}
              </p>
            )}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <p className="text-sm text-slate-400">{t.compose.locationIntro}</p>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100"
          >
            <option value="">—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.neighborhood ? ` · ${l.neighborhood}` : ''}
              </option>
            ))}
          </select>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-white"
            >
              {t.compose.narrative.titleLabel}
            </label>
            <input
              id="title"
              type="text"
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.compose.narrative.titlePlaceholder}
              className="mt-2 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100"
              aria-describedby="title-help"
            />
            <p id="title-help" className="mt-1 text-xs text-slate-500">
              {title.length}/160
            </p>
          </div>
          <div>
            <label
              htmlFor="body"
              className="block text-sm font-semibold text-white"
            >
              {t.compose.narrative.bodyLabel}
            </label>
            <textarea
              id="body"
              maxLength={8000}
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.compose.narrative.bodyPlaceholder}
              className="mt-2 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500">{body.length}/8000</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-300">
              {t.compose.narrative.languageLabel}{' '}
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as CitizenSignalsLocale)
                }
                className="ml-2 rounded border border-[#2d3748] bg-[#0f1419] px-2 py-1 text-sm"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <div className="rounded-lg border border-[#2d3748] bg-[#0f1419] p-3">
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={anonymousMode}
                onChange={(e) => setAnonymousMode(e.target.checked)}
                className="mt-0.5"
              />
              <span>{t.compose.narrative.anonymousLabel}</span>
            </label>
            {anonymousMode && (
              <input
                type="text"
                maxLength={60}
                placeholder={t.compose.narrative.aliasLabel}
                value={aliasName}
                onChange={(e) => setAliasName(e.target.value)}
                className="mt-3 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100"
              />
            )}
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-5">
          <p className="text-sm text-slate-400">{t.compose.evidence.intro}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="cursor-pointer rounded-lg border border-dashed border-[#2d3748] bg-[#0f1419] p-4 text-center text-sm text-slate-300 hover:border-emerald-400">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFile(f)
                  e.target.value = ''
                }}
              />
              <span className="block text-emerald-300">
                {uploading
                  ? locale === 'es'
                    ? 'Subiendo…'
                    : 'Uploading…'
                  : locale === 'es'
                    ? 'Subir archivo'
                    : 'Upload file'}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {t.compose.evidence.helpImage}
              </span>
            </label>
            <LinkAdder onAdd={onLinkAdd} locale={locale} />
          </div>
          {evidenceError && (
            <p className="text-sm text-rose-300">{evidenceError}</p>
          )}
          {evidence.length > 0 && (
            <ul className="space-y-2">
              {evidence.map((ev, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-300"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs uppercase text-emerald-300">
                        {ev.kind}
                      </span>{' '}
                      {ev.kind === 'link' ? ev.external_url : ev.storage_path}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEvidence((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    {locale === 'es' ? 'Quitar' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === 5 && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-white">
            {t.compose.review.legalChecklistTitle}
          </h2>
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            {t.compose.review.legalDisclaimer}
          </p>
          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={attestation}
              onChange={(e) => setAttestation(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t.compose.review.attestation}</span>
          </label>
          <p className="text-xs text-slate-500">
            <Link href="/terms" className="underline hover:text-emerald-300">
              {t.compose.review.termsLink}
            </Link>
          </p>
          {submitError && (
            <p className="rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {submitError}
            </p>
          )}
        </section>
      )}

      <div className="mt-7 flex items-center justify-between border-t border-[#1e2531] pt-5">
        <button
          type="button"
          onClick={prev}
          disabled={step === 0}
          className="text-sm text-slate-400 hover:text-white disabled:opacity-40"
        >
          ←{' '}
          {locale === 'es' ? 'Anterior' : 'Previous'}
        </button>
        {step < 5 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {locale === 'es' ? 'Siguiente' : 'Next'} →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canAdvance || submitting}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? t.compose.review.submitting
              : t.compose.review.submit}
          </button>
        )}
      </div>
    </div>
  )
}

function LinkAdder({
  onAdd,
  locale,
}: {
  onAdd: (url: string) => void
  locale: CitizenSignalsLocale
}) {
  const [v, setV] = useState('')
  return (
    <div className="rounded-lg border border-dashed border-[#2d3748] bg-[#0f1419] p-4">
      <p className="text-xs text-slate-500">
        {locale === 'es' ? 'Adjunta un enlace' : 'Attach a link'}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="url"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="https://"
          className="flex-1 rounded-lg border border-[#2d3748] bg-[#0f1419] px-2 py-1.5 text-xs text-slate-100"
        />
        <button
          type="button"
          onClick={() => {
            onAdd(v.trim())
            setV('')
          }}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400"
        >
          {locale === 'es' ? 'Agregar' : 'Add'}
        </button>
      </div>
    </div>
  )
}
