'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalPostType,
  type SignalPublicationStatus,
  type SignalSeverity,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'

export type AdminSignalRow = {
  id: string
  public_slug: string
  post_type: string
  category: string
  severity: string
  target_kind: string
  citizen_target_id: string
  conscious_location_id: string
  /** Optional partner-spot refinement inside the parent alcaldía (migration 222). */
  partner_location_id: string | null
  /** Optional citizen-typed street/intersection landmark (migration 222). */
  street_reference: string | null
  title: string
  body: string
  language: string
  anonymous_display_mode: boolean
  anonymous_display_name: string | null
  publication_status: string
  threshold_stage: number
  cosign_count: number
  /** Anonymous device-supports from migration 221; do NOT count toward escalation thresholds. */
  anonymous_support_count: number
  canonical_duplicate_of: string | null
  ai_scores: Record<string, unknown> | null
  /** Admin-only eligibility flag for sponsorship (migration 235). */
  sponsorable: boolean
  created_at: string
  updated_at: string
}

export type AdminTargetRow = {
  id: string
  slug: string
  display_name: string
  target_kind: string
  notification_email: string | null
}

export type AdminLocationLookup = {
  name: string
  city: string | null
}

const TABS: SignalPublicationStatus[] = [
  'pending_review',
  'needs_edit',
  'published',
  'disputed',
  'rejected',
  'archived',
]

type Props = {
  locale: CitizenSignalsLocale
  initialSignals: AdminSignalRow[]
  targets: AdminTargetRow[]
  /** id → {name, city} for both conscious_location_id and partner_location_id. */
  locations?: Record<string, AdminLocationLookup>
}

export default function SignalsTriage({
  locale,
  initialSignals,
  targets,
  locations = {},
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [signals, setSignals] = useState<AdminSignalRow[]>(initialSignals)
  const [tab, setTab] = useState<SignalPublicationStatus>('pending_review')
  const [pendingByRow, setPendingByRow] = useState<Record<string, boolean>>({})
  const [errorByRow, setErrorByRow] = useState<Record<string, string | null>>({})
  const [openTokensFor, setOpenTokensFor] = useState<string | null>(null)
  const [openLogFor, setOpenLogFor] = useState<string | null>(null)
  const [logRowsById, setLogRowsById] = useState<
    Record<string, { id: string; action: string; detail: unknown; created_at: string }[]>
  >({})

  const targetMap = useMemo(
    () => new Map(targets.map((t) => [t.id, t])),
    [targets]
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of signals) {
      c[s.publication_status] = (c[s.publication_status] ?? 0) + 1
    }
    return c
  }, [signals])

  const visibleSignals = signals.filter((s) => s.publication_status === tab)

  async function runAction(
    signalId: string,
    action:
      | 'approve'
      | 'publish'
      | 'reject'
      | 'needs_edit'
      | 'archive'
      | 'dispute'
      | 'unpublish'
      | 'merge',
    extras?: {
      reason?: string
      needs_edit_message?: string
      canonical_duplicate_of?: string
    }
  ) {
    setPendingByRow((p) => ({ ...p, [signalId]: true }))
    setErrorByRow((e) => ({ ...e, [signalId]: null }))
    try {
      const res = await fetch(`/api/admin/signals/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extras }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { publication_status: string }
      setSignals((prev) =>
        prev.map((s) =>
          s.id === signalId ? { ...s, publication_status: j.publication_status } : s
        )
      )
    } catch (e: unknown) {
      setErrorByRow((er) => ({
        ...er,
        [signalId]: (e as Error).message ?? 'Error',
      }))
    } finally {
      setPendingByRow((p) => ({ ...p, [signalId]: false }))
    }
  }

  async function toggleSponsorable(signalId: string, next: boolean) {
    setPendingByRow((p) => ({ ...p, [signalId]: true }))
    setErrorByRow((e) => ({ ...e, [signalId]: null }))
    try {
      const res = await fetch(`/api/admin/signals/${signalId}/sponsorable`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorable: next }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      setSignals((prev) =>
        prev.map((s) => (s.id === signalId ? { ...s, sponsorable: next } : s))
      )
    } catch (e: unknown) {
      setErrorByRow((er) => ({
        ...er,
        [signalId]: (e as Error).message ?? 'Error',
      }))
    } finally {
      setPendingByRow((p) => ({ ...p, [signalId]: false }))
    }
  }

  async function loadLog(signalId: string) {
    if (logRowsById[signalId]) return
    const res = await fetch(`/api/admin/signals/${signalId}/moderation`)
    if (!res.ok) return
    const j = (await res.json()) as {
      events: { id: string; action: string; detail: unknown; created_at: string }[]
    }
    setLogRowsById((prev) => ({ ...prev, [signalId]: j.events }))
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#2d3748] pb-3">
        {TABS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setTab(status)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === status
                ? 'bg-emerald-500/20 text-emerald-200'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.statusLabel(status)}{' '}
            <span className="ml-1 rounded bg-[#11161f] px-1.5 py-0.5 text-[10px] text-slate-300">
              {counts[status] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-slate-500">
        {locale === 'es'
          ? `Mostrando ${visibleSignals.length} de ${signals.length} señales (SLA objetivo: 72h)`
          : `Showing ${visibleSignals.length} of ${signals.length} signals (SLA target: 72h)`}
      </p>

      {visibleSignals.length === 0 ? (
        <p className="rounded-lg border border-[#2d3748] bg-[#11161f] p-6 text-center text-sm text-slate-400">
          {locale === 'es'
            ? 'No hay señales en este estado.'
            : 'No signals in this state.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {visibleSignals.map((s) => {
            const target = targetMap.get(s.citizen_target_id)
            const pending = !!pendingByRow[s.id]
            const error = errorByRow[s.id] ?? null
            const alcaldia = locations[s.conscious_location_id]?.name ?? null
            const partner =
              s.partner_location_id != null
                ? (locations[s.partner_location_id]?.name ?? null)
                : null
            // Total engagement = registered co-signs (escalation-eligible)
            // plus anonymous device-supports (migration 221, non-eligible).
            // The split matters for moderation; show both numbers but lead
            // with the sum so total reach is one glance.
            const totalEngagement = s.cosign_count + s.anonymous_support_count
            const aiAssessment = parseAiScores(s.ai_scores)
            return (
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
                      <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-slate-300">
                        {t.statusLabel(s.publication_status as SignalPublicationStatus)}
                      </span>
                      {s.sponsorable && (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-300">
                          {t.sponsor.admin.on}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-semibold text-white">
                      {s.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {target ? (
                        <>
                          {target.display_name}{' '}
                          <span className="text-slate-600">
                            ({t.targetKindLabel(target.target_kind as SignalTargetKind)})
                          </span>
                        </>
                      ) : (
                        s.target_kind
                      )}{' '}
                      ·{' '}
                      {new Date(s.created_at).toLocaleString(
                        locale === 'es' ? 'es-MX' : 'en-US'
                      )}
                    </p>
                    {(alcaldia || partner || s.street_reference) && (
                      <p className="mt-1 text-xs text-slate-400">
                        <span className="text-slate-500">
                          {locale === 'es' ? 'Ubicación: ' : 'Location: '}
                        </span>
                        {alcaldia ?? (locale === 'es' ? 'Sin alcaldía' : 'No alcaldía')}
                        {partner && (
                          <>
                            <span className="text-slate-600"> · </span>
                            {partner}
                          </>
                        )}
                        {s.street_reference && (
                          <>
                            <span className="text-slate-600"> · </span>
                            <span className="italic">{s.street_reference}</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <span
                      className="font-semibold text-emerald-300"
                      title={
                        locale === 'es'
                          ? `${s.cosign_count} co-firmas + ${s.anonymous_support_count} anónimas`
                          : `${s.cosign_count} co-signs + ${s.anonymous_support_count} anonymous`
                      }
                    >
                      {locale === 'es'
                        ? `${totalEngagement} de apoyo`
                        : `${totalEngagement} support`}
                    </span>
                    <span className="text-slate-500">
                      {locale === 'es'
                        ? `(${s.cosign_count} co-firmas · ${s.anonymous_support_count} anón.)`
                        : `(${s.cosign_count} co-signs · ${s.anonymous_support_count} anon.)`}
                    </span>
                    {s.publication_status === 'published' && (
                      <Link
                        href={`/signals/${s.public_slug}`}
                        target="_blank"
                        className="text-emerald-300 underline hover:text-emerald-200"
                      >
                        {locale === 'es' ? 'Ver pública' : 'View public'}
                      </Link>
                    )}
                  </div>
                </header>

                <p className="mt-3 whitespace-pre-line text-sm text-slate-300">
                  {s.body}
                </p>

                {aiAssessment && (
                  <AiAssessmentCard
                    locale={locale}
                    assessment={aiAssessment}
                  />
                )}

                {/* Actions row */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.publication_status === 'pending_review' && (
                    <>
                      <ActionBtn
                        label={locale === 'es' ? 'Aprobar y publicar' : 'Approve & publish'}
                        tone="emerald"
                        pending={pending}
                        onClick={() => void runAction(s.id, 'approve')}
                      />
                      <ActionBtn
                        label={locale === 'es' ? 'Pedir edición' : 'Needs edit'}
                        tone="amber"
                        pending={pending}
                        onClick={() => {
                          const msg = window.prompt(
                            locale === 'es'
                              ? 'Mensaje al autor:'
                              : 'Message to author:',
                            ''
                          )
                          if (msg && msg.trim()) {
                            void runAction(s.id, 'needs_edit', {
                              needs_edit_message: msg.trim(),
                            })
                          }
                        }}
                      />
                      <ActionBtn
                        label={locale === 'es' ? 'Rechazar' : 'Reject'}
                        tone="rose"
                        pending={pending}
                        onClick={() => {
                          const reason = window.prompt(
                            locale === 'es' ? 'Razón:' : 'Reason:',
                            ''
                          )
                          if (reason && reason.trim()) {
                            void runAction(s.id, 'reject', {
                              reason: reason.trim(),
                            })
                          }
                        }}
                      />
                    </>
                  )}
                  {s.publication_status === 'published' && (
                    <>
                      <ActionBtn
                        label={locale === 'es' ? 'Despublicar' : 'Unpublish'}
                        tone="slate"
                        pending={pending}
                        onClick={() => void runAction(s.id, 'unpublish')}
                      />
                      <ActionBtn
                        label={locale === 'es' ? 'Marcar disputado' : 'Dispute'}
                        tone="rose"
                        pending={pending}
                        onClick={() => void runAction(s.id, 'dispute')}
                      />
                      <ActionBtn
                        label={locale === 'es' ? 'Archivar' : 'Archive'}
                        tone="slate"
                        pending={pending}
                        onClick={() => void runAction(s.id, 'archive')}
                      />
                    </>
                  )}
                  {s.publication_status === 'needs_edit' && (
                    <ActionBtn
                      label={locale === 'es' ? 'Volver a revisión' : 'Back to review'}
                      tone="slate"
                      pending={pending}
                      onClick={() => void runAction(s.id, 'unpublish')}
                    />
                  )}
                  <ActionBtn
                    label={locale === 'es' ? 'Fusionar con…' : 'Merge into…'}
                    tone="slate"
                    pending={pending}
                    onClick={() => {
                      const targetSlug = window.prompt(
                        locale === 'es'
                          ? 'Slug canónico al que fusionar:'
                          : 'Canonical slug to merge into:',
                        ''
                      )
                      if (!targetSlug) return
                      void (async () => {
                        const res = await fetch(
                          `/api/admin/signals?status=published&limit=200`
                        )
                        if (!res.ok) return
                        const j = (await res.json()) as {
                          signals: AdminSignalRow[]
                        }
                        const canon = j.signals.find(
                          (x) => x.public_slug === targetSlug.trim()
                        )
                        if (!canon) {
                          setErrorByRow((er) => ({
                            ...er,
                            [s.id]: locale === 'es' ? 'Slug no encontrado' : 'Slug not found',
                          }))
                          return
                        }
                        await runAction(s.id, 'merge', {
                          canonical_duplicate_of: canon.id,
                        })
                      })()
                    }}
                  />
                  <ActionBtn
                    label={
                      s.sponsorable
                        ? t.sponsor.admin.disable
                        : t.sponsor.admin.enable
                    }
                    tone={s.sponsorable ? 'amber' : 'slate'}
                    pending={pending}
                    onClick={() => void toggleSponsorable(s.id, !s.sponsorable)}
                  />
                  {s.sponsorable && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/sponsor/signal/${s.id}`
                        void navigator.clipboard?.writeText(url)
                      }}
                      className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/10"
                    >
                      {t.sponsor.admin.copyLink}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const next = openLogFor === s.id ? null : s.id
                      setOpenLogFor(next)
                      if (next) void loadLog(s.id)
                    }}
                    className="rounded-lg border border-[#2d3748] px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    {openLogFor === s.id
                      ? locale === 'es'
                        ? 'Ocultar log'
                        : 'Hide log'
                      : locale === 'es'
                        ? 'Ver log'
                        : 'View log'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenTokensFor(
                        openTokensFor === s.citizen_target_id
                          ? null
                          : s.citizen_target_id
                      )
                    }
                    className="rounded-lg border border-[#2d3748] px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    {locale === 'es' ? 'Enlace mágico al destinatario' : 'Target magic link'}
                  </button>
                </div>

                {error && (
                  <p className="mt-3 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </p>
                )}

                {openLogFor === s.id && (
                  <details open className="mt-4 rounded-lg border border-[#2d3748] bg-[#0f1419] p-3 text-xs text-slate-300">
                    <summary className="cursor-pointer text-slate-400">
                      {locale === 'es' ? 'Log de moderación' : 'Moderation log'}
                    </summary>
                    {(logRowsById[s.id] ?? []).map((ev) => (
                      <div key={ev.id} className="mt-2 border-t border-[#1e2531] pt-2">
                        <p className="font-semibold text-slate-300">
                          {ev.action}
                        </p>
                        <p className="text-slate-500">
                          {new Date(ev.created_at).toLocaleString()}
                        </p>
                        <pre className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400">
                          {JSON.stringify(ev.detail, null, 2)}
                        </pre>
                      </div>
                    ))}
                    {!logRowsById[s.id] && (
                      <p className="mt-2 text-slate-500">{locale === 'es' ? 'Cargando…' : 'Loading…'}</p>
                    )}
                  </details>
                )}

                {openTokensFor === s.citizen_target_id && (
                  <TargetTokenPanel
                    locale={locale}
                    target={targetMap.get(s.citizen_target_id) ?? null}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ActionBtn({
  label,
  tone,
  pending,
  onClick,
}: {
  label: string
  tone: 'emerald' | 'amber' | 'rose' | 'slate'
  pending: boolean
  onClick: () => void
}) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-500 text-white hover:bg-emerald-400'
      : tone === 'amber'
        ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30'
        : tone === 'rose'
          ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30'
          : 'bg-[#0f1419] text-slate-300 border border-[#2d3748] hover:text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex min-h-[36px] items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
    >
      {pending ? '…' : label}
    </button>
  )
}

function TargetTokenPanel({
  locale,
  target,
}: {
  locale: CitizenSignalsLocale
  target: AdminTargetRow | null
}) {
  const [pending, setPending] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [expires, setExpires] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState(target?.notification_email ?? '')
  const [savingEmail, setSavingEmail] = useState(false)

  if (!target) return null

  const mintToken = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/signals/targets/${target.id}/access-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { url: string; expires_at: string }
      setUrl(j.url)
      setExpires(j.expires_at)
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error')
    } finally {
      setPending(false)
    }
  }

  const revoke = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/signals/targets/${target.id}/access-token`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      setUrl(null)
      setExpires(null)
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error')
    } finally {
      setPending(false)
    }
  }

  const saveEmail = async () => {
    setSavingEmail(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/signals/targets/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_email: email.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error')
    } finally {
      setSavingEmail(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-[#2d3748] bg-[#0f1419] p-4 text-xs">
      <p className="font-semibold text-white">
        {target.display_name}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-slate-500">
            {locale === 'es' ? 'Email de notificación' : 'Notification email'}
          </span>
          <div className="mt-1 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@ejemplo.gob.mx"
              className="flex-1 rounded border border-[#2d3748] bg-[#11161f] px-2 py-1 text-slate-100"
            />
            <button
              type="button"
              onClick={() => void saveEmail()}
              disabled={savingEmail}
              className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"
            >
              {savingEmail
                ? '…'
                : locale === 'es'
                  ? 'Guardar'
                  : 'Save'}
            </button>
          </div>
        </label>
        <div>
          <span className="text-slate-500">
            {locale === 'es' ? 'Enlace mágico' : 'Magic link'}
          </span>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => void mintToken()}
              disabled={pending}
              className="rounded bg-emerald-500 px-3 py-1 text-white hover:bg-emerald-400 disabled:opacity-60"
            >
              {pending
                ? '…'
                : locale === 'es'
                  ? 'Generar enlace nuevo'
                  : 'Generate new link'}
            </button>
            <button
              type="button"
              onClick={() => void revoke()}
              disabled={pending}
              className="rounded border border-rose-500/40 px-3 py-1 text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
            >
              {locale === 'es' ? 'Revocar' : 'Revoke'}
            </button>
          </div>
        </div>
      </div>
      {url && (
        <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-500/10 p-2">
          <p className="text-emerald-200">
            {locale === 'es'
              ? 'Copia este enlace ahora — no podrás verlo de nuevo.'
              : 'Copy this link now — it will not be shown again.'}
          </p>
          <code className="mt-1 block break-all text-emerald-100">{url}</code>
          {expires && (
            <p className="mt-1 text-emerald-200/80">
              {locale === 'es' ? 'Expira: ' : 'Expires: '}
              {new Date(expires).toLocaleString()}
            </p>
          )}
        </div>
      )}
      {error && (
        <p className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// AI assessment card (F14: lib/agents/signals-moderator.ts).
//
// The moderator agent writes a structured `SignalsModeratorOutput` to
// `citizen_signals.ai_scores` (jsonb). We parse the subset the triage UI
// surfaces inline, defensively narrowing each field so a malformed or
// partial row never crashes the queue. Unrecognised shapes simply hide
// the card.
// -----------------------------------------------------------------------------

type ParsedAiAssessment = {
  recommendedAction:
    | 'auto_publish'
    | 'human_review'
    | 'request_edit'
    | 'reject'
    | null
  categoryGuess: string | null
  categoryConfidence: number | null
  severityGuess: 'low' | 'medium' | 'high' | 'critical' | null
  severityConfidence: number | null
  piiCount: number | null
  defamationRisk: 'low' | 'medium' | 'high' | null
  summaryEs: string | null
  summaryEn: string | null
  rationale: string | null
}

function parseAiScores(
  raw: Record<string, unknown> | null
): ParsedAiAssessment | null {
  if (!raw || typeof raw !== 'object') return null
  // Schema-version sanity check: only render assessments that match the
  // shape we know how to display. Agent emits schema_version: 1 today; if
  // the prompt is rev'd to a breaking schema we want this card to hide
  // gracefully rather than render garbage.
  const sv = raw.schema_version
  if (sv !== 1 && sv !== undefined) return null

  const recommendedAction = pickEnum(raw.recommended_action, [
    'auto_publish',
    'human_review',
    'request_edit',
    'reject',
  ])
  const severityGuess = pickEnum(raw.severity_guess, [
    'low',
    'medium',
    'high',
    'critical',
  ])
  const defamationRisk = pickEnum(raw.defamation_risk, ['low', 'medium', 'high'])

  const categoryGuess =
    typeof raw.category_guess === 'string' ? raw.category_guess : null
  const categoryConfidence = numberOrNull(raw.category_confidence)
  const severityConfidence = numberOrNull(raw.severity_confidence)
  const piiCount = Array.isArray(raw.pii_detected)
    ? raw.pii_detected.length
    : null
  const summaryEs = typeof raw.summary_es === 'string' ? raw.summary_es : null
  const summaryEn = typeof raw.summary_en === 'string' ? raw.summary_en : null
  const rationale =
    typeof raw.recommendation_rationale === 'string'
      ? raw.recommendation_rationale
      : null

  // If nothing useful parsed, hide the card.
  if (
    !recommendedAction &&
    !categoryGuess &&
    !severityGuess &&
    !defamationRisk &&
    !summaryEs &&
    !summaryEn
  ) {
    return null
  }

  return {
    recommendedAction,
    categoryGuess,
    categoryConfidence,
    severityGuess,
    severityConfidence,
    piiCount,
    defamationRisk,
    summaryEs,
    summaryEn,
    rationale,
  }
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function AiAssessmentCard({
  locale,
  assessment,
}: {
  locale: CitizenSignalsLocale
  assessment: ParsedAiAssessment
}) {
  const a = assessment
  const summary = locale === 'es' ? a.summaryEs : a.summaryEn

  return (
    <div className="mt-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
          {locale === 'es' ? 'IA · Evaluación' : 'AI · Assessment'}
        </span>
        {a.recommendedAction && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${recommendedActionTone(a.recommendedAction)}`}
            title={a.rationale ?? undefined}
          >
            {recommendedActionLabel(locale, a.recommendedAction)}
          </span>
        )}
        {a.severityGuess && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">
            {locale === 'es' ? 'Urgencia' : 'Severity'}: {a.severityGuess}
            {a.severityConfidence != null && (
              <span className="ml-1 text-amber-300/60">
                ({Math.round(a.severityConfidence * 100)}%)
              </span>
            )}
          </span>
        )}
        {a.categoryGuess && (
          <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-slate-300">
            {locale === 'es' ? 'Categoría' : 'Category'}: {a.categoryGuess}
            {a.categoryConfidence != null && (
              <span className="ml-1 text-slate-400/70">
                ({Math.round(a.categoryConfidence * 100)}%)
              </span>
            )}
          </span>
        )}
        {a.piiCount != null && a.piiCount > 0 && (
          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-200">
            {locale === 'es' ? 'PII detectada' : 'PII detected'}: {a.piiCount}
          </span>
        )}
        {a.defamationRisk && (
          <span
            className={`rounded-full px-2 py-0.5 ${defamationTone(a.defamationRisk)}`}
          >
            {locale === 'es' ? 'Riesgo difamación' : 'Defamation risk'}:{' '}
            {a.defamationRisk}
          </span>
        )}
      </div>
      {summary && (
        <p className="mt-2 text-slate-300">
          {summary}
        </p>
      )}
      {a.rationale && (
        <p className="mt-1 text-slate-500">
          <span className="text-slate-600">
            {locale === 'es' ? 'Razonamiento: ' : 'Rationale: '}
          </span>
          {a.rationale}
        </p>
      )}
    </div>
  )
}

function recommendedActionLabel(
  locale: CitizenSignalsLocale,
  action: NonNullable<ParsedAiAssessment['recommendedAction']>
): string {
  if (locale === 'es') {
    switch (action) {
      case 'auto_publish':
        return 'Auto-publicar'
      case 'human_review':
        return 'Revisión humana'
      case 'request_edit':
        return 'Pedir edición'
      case 'reject':
        return 'Rechazar'
    }
  }
  switch (action) {
    case 'auto_publish':
      return 'Auto-publish'
    case 'human_review':
      return 'Human review'
    case 'request_edit':
      return 'Request edit'
    case 'reject':
      return 'Reject'
  }
}

function recommendedActionTone(
  action: NonNullable<ParsedAiAssessment['recommendedAction']>
): string {
  switch (action) {
    case 'auto_publish':
      return 'bg-emerald-500/20 text-emerald-200'
    case 'human_review':
      return 'bg-amber-500/20 text-amber-200'
    case 'request_edit':
      return 'bg-sky-500/20 text-sky-200'
    case 'reject':
      return 'bg-rose-500/20 text-rose-200'
  }
}

function defamationTone(
  risk: NonNullable<ParsedAiAssessment['defamationRisk']>
): string {
  switch (risk) {
    case 'low':
      return 'bg-emerald-500/15 text-emerald-200'
    case 'medium':
      return 'bg-amber-500/15 text-amber-200'
    case 'high':
      return 'bg-rose-500/15 text-rose-200'
  }
}
