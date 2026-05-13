'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalPostType,
  type SignalSeverity,
} from '@/lib/i18n/citizen-signals'

export type TargetDashboardSignal = {
  id: string
  public_slug: string
  post_type: string
  category: string
  severity: string
  title: string
  body: string
  language: string
  cosign_count: number
  threshold_stage: number
  stage1_met_at: string | null
  stage2_met_at: string | null
  created_at: string
  latest_response:
    | {
        signal_id: string
        body: string
        official_status: string
        created_at: string
      }
    | null
    | undefined
}

type Props = {
  locale: CitizenSignalsLocale
  rawToken: string
  targetName: string
  signals: TargetDashboardSignal[]
}

export default function TargetDashboardClient({
  locale,
  rawToken,
  targetName,
  signals,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [signalsState, setSignalsState] = useState<TargetDashboardSignal[]>(signals)

  if (signalsState.length === 0) {
    return (
      <p className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-6 text-center text-sm text-slate-400">
        {locale === 'es'
          ? 'No hay señales pendientes en este momento.'
          : 'No pending signals at the moment.'}
      </p>
    )
  }

  return (
    <ul className="space-y-5">
      {signalsState.map((s) => (
        <li
          key={s.id}
          className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-5"
        >
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold uppercase tracking-wide text-emerald-300">
                  {t.postTypeLabel(s.post_type as SignalPostType)}
                </span>
                <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-slate-300">
                  {t.categoryLabel(s.category as SignalCategory)}
                </span>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-200">
                  {t.severityLabel(s.severity as SignalSeverity)}
                </span>
                {s.threshold_stage >= 1 && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-200">
                    {s.threshold_stage >= 2
                      ? t.stages.stage2.label
                      : t.stages.stage1.label}
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {s.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t.detail.cosignsLabel(s.cosign_count)} ·{' '}
                {new Date(s.created_at).toLocaleString(
                  locale === 'es' ? 'es-MX' : 'en-US'
                )}
              </p>
            </div>
            <Link
              href={`/signals/${s.public_slug}`}
              target="_blank"
              className="text-xs text-emerald-300 underline hover:text-emerald-200"
            >
              {locale === 'es' ? 'Ver pública' : 'View public'}
            </Link>
          </header>

          <p className="mt-3 whitespace-pre-line text-sm text-slate-300">
            {s.body}
          </p>

          {s.latest_response && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
              <p className="font-semibold text-emerald-200">
                {locale === 'es'
                  ? 'Última respuesta enviada'
                  : 'Latest reply sent'}
              </p>
              <p className="mt-1 text-emerald-100">{s.latest_response.body}</p>
              <p className="mt-1 text-emerald-200/80">
                {t.targetDash.statusOptions[
                  s.latest_response.official_status as
                    | 'acknowledged'
                    | 'in_progress'
                    | 'resolved'
                ]} ·{' '}
                {new Date(s.latest_response.created_at).toLocaleString()}
              </p>
            </div>
          )}

          <ResponseComposer
            locale={locale}
            rawToken={rawToken}
            signalId={s.id}
            targetName={targetName}
            onPosted={(resp) =>
              setSignalsState((prev) =>
                prev.map((row) =>
                  row.id === s.id
                    ? {
                        ...row,
                        latest_response: {
                          signal_id: row.id,
                          body: resp.body,
                          official_status: resp.official_status,
                          created_at: resp.created_at,
                        },
                      }
                    : row
                )
              )
            }
          />
        </li>
      ))}
    </ul>
  )
}

function ResponseComposer({
  locale,
  rawToken,
  signalId,
  targetName,
  onPosted,
}: {
  locale: CitizenSignalsLocale
  rawToken: string
  signalId: string
  targetName: string
  onPosted: (r: { body: string; official_status: string; created_at: string }) => void
}) {
  const t = getCitizenSignalsCopy(locale)
  const [authorLabel, setAuthorLabel] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'acknowledged' | 'in_progress' | 'resolved'>(
    'acknowledged'
  )
  const [attest, setAttest] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/target/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken,
          signal_id: signalId,
          author_label: authorLabel.trim(),
          body: body.trim(),
          official_status: status,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as {
        body: string
        official_status: string
        created_at: string
      }
      onPosted({ body: j.body, official_status: j.official_status, created_at: j.created_at })
      setBody('')
      setAuthorLabel('')
      setAttest(false)
      setOpen(false)
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error')
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
      >
        {locale === 'es' ? 'Responder oficialmente' : 'Reply officially'}
      </button>
    )
  }

  const canSubmit =
    attest &&
    authorLabel.trim().length >= 2 &&
    body.trim().length >= 2 &&
    !pending

  return (
    <div className="mt-4 rounded-lg border border-[#2d3748] bg-[#0f1419] p-4 text-sm">
      <p className="font-semibold text-white">
        {locale === 'es' ? 'Respuesta oficial' : 'Official reply'} — {targetName}
      </p>
      <label className="mt-3 block">
        <span className="text-xs text-slate-400">
          {locale === 'es' ? 'Cargo o rol' : 'Role / job title'}
        </span>
        <input
          type="text"
          maxLength={200}
          value={authorLabel}
          onChange={(e) => setAuthorLabel(e.target.value)}
          placeholder={
            locale === 'es'
              ? 'Ej. Director de Vinculación'
              : 'E.g. Community Liaison Director'
          }
          className="mt-1 w-full rounded border border-[#2d3748] bg-[#11161f] px-2 py-1.5 text-slate-100"
        />
      </label>
      <label className="mt-3 block">
        <span className="text-xs text-slate-400">{t.detail.commentsTitle}</span>
        <textarea
          rows={4}
          maxLength={8000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.targetDash.replyPlaceholder}
          className="mt-1 w-full rounded border border-[#2d3748] bg-[#11161f] px-2 py-1.5 text-slate-100"
        />
      </label>
      <label className="mt-3 block">
        <span className="text-xs text-slate-400">{t.targetDash.statusLabel}</span>
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as 'acknowledged' | 'in_progress' | 'resolved')
          }
          className="mt-1 w-full rounded border border-[#2d3748] bg-[#11161f] px-2 py-1.5 text-slate-100"
        >
          <option value="acknowledged">{t.targetDash.statusOptions.acknowledged}</option>
          <option value="in_progress">{t.targetDash.statusOptions.in_progress}</option>
          <option value="resolved">{t.targetDash.statusOptions.resolved}</option>
        </select>
      </label>
      <label className="mt-3 flex items-start gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={attest}
          onChange={(e) => setAttest(e.target.checked)}
          className="mt-0.5"
        />
        <span>{t.targetDash.roleAttest}</span>
      </label>
      {error && (
        <p className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-white"
        >
          {locale === 'es' ? 'Cancelar' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="inline-flex min-h-[40px] items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? locale === 'es'
              ? 'Enviando…'
              : 'Sending…'
            : t.targetDash.submit}
        </button>
      </div>
    </div>
  )
}
