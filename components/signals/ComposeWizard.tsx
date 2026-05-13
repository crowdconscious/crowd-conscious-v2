'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import {
  getCitizenSignalsCopy,
  SIGNAL_CATEGORIES,
  SIGNAL_POST_TYPES,
  SIGNAL_SEVERITIES,
  type CitizenSignalsLocale,
  type SignalCategory,
  type SignalPostType,
  type SignalSeverity,
  type SignalTargetKind,
} from '@/lib/i18n/citizen-signals'
import StepProgress from '@/components/signals/wizard/StepProgress'
import TargetPicker, {
  type TargetOption,
} from '@/components/signals/wizard/TargetPicker'
import LocationPicker, {
  type LocationOption,
  type RefinementMode,
} from '@/components/signals/wizard/LocationPicker'
import EvidenceUploader, {
  type EvidenceItem,
} from '@/components/signals/wizard/EvidenceUploader'

export type ComposeTarget = TargetOption
export type ComposeLocation = LocationOption

type Props = {
  locale: CitizenSignalsLocale
  targets: ReadonlyArray<ComposeTarget>
  /** The 16 CDMX alcaldías (Stage A of the location picker). */
  alcaldias: ReadonlyArray<ComposeLocation>
  /** Other active CDMX conscious_locations (Stage B partner options). */
  partnerLocations: ReadonlyArray<ComposeLocation>
  userDefaultLanguage: CitizenSignalsLocale
  /** Used to scope the localStorage draft so multiple accounts don't collide. */
  userId: string
}

type Step = 0 | 1 | 2 | 3 | 4 | 5
const TOTAL_STEPS = 6
// Bumped to v2 with migration 222 (street-level precision). Older v1
// drafts simply get discarded — the rehydration check is `parsed.v ===
// DRAFT_VERSION` so a v1 payload yields the default empty draft.
const DRAFT_VERSION = 2

type DraftState = {
  v: number
  postType: SignalPostType
  category: SignalCategory
  severity: SignalSeverity
  targetKind: SignalTargetKind
  targetId: string
  locationId: string
  /** RefinementMode for step 3 stage B. */
  refinementMode: RefinementMode
  /** Set when refinementMode === 'partner'. */
  partnerLocationId: string | null
  /** Set when refinementMode === 'street'. */
  streetReference: string
  title: string
  body: string
  language: CitizenSignalsLocale
  anonymousMode: boolean
  aliasName: string
  evidence: EvidenceItem[]
}

type StepErrors = {
  type?: { category?: string; severity?: string }
  target?: { targetId?: string }
  location?: {
    locationId?: string
    partnerLocationId?: string
    streetReference?: string
  }
  narrative?: { title?: string; body?: string }
  review?: { aliasName?: string; attestation?: string }
}

const SEVERITY_ACCENTS: Record<SignalSeverity, string> = {
  low: 'border-emerald-400 bg-emerald-500/10 text-emerald-200',
  medium: 'border-sky-400 bg-sky-500/10 text-sky-200',
  high: 'border-amber-400 bg-amber-500/10 text-amber-200',
  critical: 'border-rose-400 bg-rose-500/10 text-rose-200',
}

const SEVERITY_DOTS: Record<SignalSeverity, string> = {
  low: 'bg-emerald-400',
  medium: 'bg-sky-400',
  high: 'bg-amber-400',
  critical: 'bg-rose-400',
}

function emptyDraft(language: CitizenSignalsLocale): DraftState {
  return {
    v: DRAFT_VERSION,
    postType: 'complaint',
    category: 'environment',
    severity: 'medium',
    targetKind: 'municipality',
    targetId: '',
    locationId: '',
    refinementMode: 'none',
    partnerLocationId: null,
    streetReference: '',
    title: '',
    body: '',
    language,
    anonymousMode: false,
    aliasName: '',
    evidence: [],
  }
}

function draftStorageKey(userId: string) {
  return `signals.compose-draft.v${DRAFT_VERSION}.${userId}`
}

/**
 * Multi-step compose wizard for Citizen Signals. Drives POST /api/signals
 * after walking the user through type/target/location/narrative/evidence
 * and a legal disclaimer.
 *
 * Validation: zod schemas per step. The schemas reject anything the API
 * would reject (target_kind enum, severity, narrative bounds) plus a few
 * stricter UX limits (title 10–120, body 50–4000) so the user never sees
 * a server error for shape problems.
 *
 * Persistence: the draft is mirrored to localStorage on every change,
 * keyed by user id. We clear it after a successful submit. Evidence
 * preview URLs (object URLs) are stripped before persistence so refresh
 * doesn't try to revive dead blob: URLs.
 */
export default function ComposeWizard({
  locale,
  targets,
  alcaldias,
  partnerLocations,
  userDefaultLanguage,
  userId,
}: Props) {
  const router = useRouter()
  const t = getCitizenSignalsCopy(locale)
  const storageKey = draftStorageKey(userId)

  const [step, setStep] = useState<Step>(0)
  const [draft, setDraft] = useState<DraftState>(() =>
    emptyDraft(userDefaultLanguage)
  )
  const [errors, setErrors] = useState<StepErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const [attestation, setAttestation] = useState(false)
  const hydratedRef = useRef(false)

  // ---------------------------------------------------------------------------
  // Draft hydration / persistence
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DraftState>
        if (parsed && parsed.v === DRAFT_VERSION) {
          setDraft((current) => ({ ...current, ...parsed, v: DRAFT_VERSION }))
          setDraftRestored(true)
        }
      }
    } catch {
      // ignore corrupt localStorage; fall back to empty draft
    }
    hydratedRef.current = true
  }, [storageKey])

  useEffect(() => {
    if (!hydratedRef.current || typeof window === 'undefined') return
    try {
      // Strip object URLs (preview_url) and File-only fields before persisting
      // so a refresh doesn't try to revive blob: URLs that no longer exist.
      const safeEvidence = draft.evidence.map((ev) => {
        if (ev.kind === 'link') return ev
        const { preview_url: _preview, ...rest } = ev
        void _preview
        return rest
      })
      const safe: DraftState = { ...draft, evidence: safeEvidence }
      window.localStorage.setItem(storageKey, JSON.stringify(safe))
    } catch {
      // localStorage may be full / disabled; ignore
    }
  }, [draft, storageKey])

  const update = useCallback(<K extends keyof DraftState>(
    key: K,
    value: DraftState[K]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }, [])

  // ---------------------------------------------------------------------------
  // Per-step zod schemas
  // ---------------------------------------------------------------------------
  const schemas = useMemo(() => {
    return {
      type: z.object({
        postType: z.enum(SIGNAL_POST_TYPES),
        category: z.enum(SIGNAL_CATEGORIES),
        severity: z.enum(SIGNAL_SEVERITIES),
      }),
      target: z.object({
        targetId: z
          .string()
          .uuid({ message: t.compose.validation.targetRequired }),
      }),
      location: z
        .object({
          locationId: z.string().uuid({
            message: t.compose.location.validation.alcaldiaRequired,
          }),
          refinementMode: z.enum(['none', 'partner', 'street']),
          partnerLocationId: z.string().uuid().nullable(),
          streetReference: z.string(),
        })
        .superRefine((value, ctx) => {
          if (value.refinementMode === 'partner') {
            if (!value.partnerLocationId) {
              ctx.addIssue({
                code: 'custom',
                path: ['partnerLocationId'],
                message: t.compose.location.validation.alcaldiaRequired,
              })
            }
          } else if (value.refinementMode === 'street') {
            const trimmed = value.streetReference.trim()
            if (trimmed.length === 0) {
              ctx.addIssue({
                code: 'custom',
                path: ['streetReference'],
                message:
                  t.compose.location.validation.streetAllWhitespace,
              })
            } else if (trimmed.length < 3) {
              ctx.addIssue({
                code: 'custom',
                path: ['streetReference'],
                message: t.compose.location.validation.streetTooShort,
              })
            } else if (trimmed.length > 160) {
              ctx.addIssue({
                code: 'custom',
                path: ['streetReference'],
                message: t.compose.location.validation.streetTooLong,
              })
            }
          }
          // Defense-in-depth — UI prevents this, but the schema rejects
          // both at once anyway so the server never sees a malformed
          // payload from a misbehaving client.
          if (
            value.refinementMode === 'partner' &&
            value.streetReference.trim().length > 0
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['streetReference'],
              message: t.compose.location.validation.bothPrecisionsSet,
            })
          }
          if (
            value.refinementMode === 'street' &&
            value.partnerLocationId
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['partnerLocationId'],
              message: t.compose.location.validation.bothPrecisionsSet,
            })
          }
        }),
      narrative: z.object({
        title: z
          .string()
          .trim()
          .min(10, t.compose.validation.titleTooShort)
          .max(120, t.compose.validation.titleTooLong),
        body: z
          .string()
          .trim()
          .min(50, t.compose.validation.bodyTooShort)
          .max(4000, t.compose.validation.bodyTooLong),
      }),
      review: z
        .object({
          anonymousMode: z.boolean(),
          aliasName: z.string().trim(),
          attestation: z.literal(true, {
            message: t.compose.validation.attestationRequired,
          }),
        })
        .superRefine((value, ctx) => {
          if (value.anonymousMode) {
            if (!value.aliasName || value.aliasName.length === 0) {
              ctx.addIssue({
                code: 'custom',
                path: ['aliasName'],
                message: t.compose.validation.aliasRequired,
              })
            } else if (value.aliasName.length < 2) {
              ctx.addIssue({
                code: 'custom',
                path: ['aliasName'],
                message: t.compose.validation.aliasTooShort,
              })
            } else if (value.aliasName.length > 60) {
              ctx.addIssue({
                code: 'custom',
                path: ['aliasName'],
                message: t.compose.validation.aliasTooLong,
              })
            }
          }
        }),
    }
  }, [t])

  const validateStep = useCallback(
    (target: Step): boolean => {
      switch (target) {
        case 0: {
          const r = schemas.type.safeParse({
            postType: draft.postType,
            category: draft.category,
            severity: draft.severity,
          })
          if (r.success) {
            setErrors((prev) => ({ ...prev, type: undefined }))
            return true
          }
          const flat = r.error.flatten().fieldErrors
          setErrors((prev) => ({
            ...prev,
            type: {
              category: flat.category?.[0],
              severity: flat.severity?.[0],
            },
          }))
          return false
        }
        case 1: {
          const r = schemas.target.safeParse({ targetId: draft.targetId })
          if (r.success) {
            setErrors((prev) => ({ ...prev, target: undefined }))
            return true
          }
          setErrors((prev) => ({
            ...prev,
            target: {
              targetId: r.error.issues[0]?.message,
            },
          }))
          return false
        }
        case 2: {
          const r = schemas.location.safeParse({
            locationId: draft.locationId,
            refinementMode: draft.refinementMode,
            partnerLocationId: draft.partnerLocationId,
            streetReference: draft.streetReference,
          })
          if (r.success) {
            setErrors((prev) => ({ ...prev, location: undefined }))
            return true
          }
          const flat = r.error.flatten().fieldErrors
          setErrors((prev) => ({
            ...prev,
            location: {
              locationId: flat.locationId?.[0],
              partnerLocationId: flat.partnerLocationId?.[0],
              streetReference: flat.streetReference?.[0],
            },
          }))
          return false
        }
        case 3: {
          const r = schemas.narrative.safeParse({
            title: draft.title,
            body: draft.body,
          })
          if (r.success) {
            setErrors((prev) => ({ ...prev, narrative: undefined }))
            return true
          }
          const flat = r.error.flatten().fieldErrors
          setErrors((prev) => ({
            ...prev,
            narrative: {
              title: flat.title?.[0],
              body: flat.body?.[0],
            },
          }))
          return false
        }
        case 4: {
          // Evidence is optional; the per-item validation lives in the
          // EvidenceUploader. Always allow advancing.
          return true
        }
        case 5: {
          const r = schemas.review.safeParse({
            anonymousMode: draft.anonymousMode,
            aliasName: draft.aliasName.trim(),
            attestation,
          })
          if (r.success) {
            setErrors((prev) => ({ ...prev, review: undefined }))
            return true
          }
          const flat = r.error.flatten().fieldErrors
          setErrors((prev) => ({
            ...prev,
            review: {
              aliasName: flat.aliasName?.[0],
              attestation: flat.attestation?.[0],
            },
          }))
          return false
        }
        default:
          return false
      }
    },
    [attestation, draft, schemas]
  )

  const goNext = () => {
    if (!validateStep(step)) return
    setStep((s) => (s < 5 ? ((s + 1) as Step) : s))
  }

  const goPrev = () => {
    setStep((s) => (s > 0 ? ((s - 1) as Step) : s))
  }

  const jumpTo = (idx: number) => {
    if (idx >= 0 && idx < step) {
      setStep(idx as Step)
    }
  }

  const submit = async () => {
    if (!validateStep(5)) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const evidencePayload = draft.evidence.map((ev) => {
        if (ev.kind === 'link') {
          return {
            kind: 'link' as const,
            external_url: ev.external_url,
            caption: ev.caption || null,
          }
        }
        return {
          kind: ev.kind,
          storage_path: ev.storage_path,
          caption: ev.caption || null,
        }
      })

      // Refinement (mutually exclusive). The API also enforces this; we
      // shape it client-side so payload inspection stays self-explanatory.
      const partner_location_id =
        draft.refinementMode === 'partner' ? draft.partnerLocationId : null
      const street_reference =
        draft.refinementMode === 'street'
          ? draft.streetReference.trim()
          : null

      const payload = {
        post_type: draft.postType,
        category: draft.category,
        severity: draft.severity,
        target_kind: draft.targetKind,
        citizen_target_id: draft.targetId,
        title: draft.title.trim(),
        body: draft.body.trim(),
        language: draft.language,
        conscious_location_id: draft.locationId,
        partner_location_id,
        street_reference,
        anonymous_display_mode: draft.anonymousMode,
        anonymous_display_name: draft.anonymousMode
          ? draft.aliasName.trim()
          : null,
        evidence: evidencePayload,
      }

      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          j.error ?? t.compose.validation.submitFailed
        )
      }
      const j = (await res.json()) as { slug?: string }
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(storageKey)
        }
      } catch {
        // ignore
      }
      const dest = j.slug
        ? `/signals/nueva/listo?slug=${encodeURIComponent(j.slug)}`
        : '/signals/nueva/listo'
      router.push(dest)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t.compose.validation.submitFailed
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const clearDraft = () => {
    setDraft(emptyDraft(userDefaultLanguage))
    setAttestation(false)
    setErrors({})
    setStep(0)
    setDraftRestored(false)
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKey)
      }
    } catch {
      // ignore
    }
  }

  const stepLabels = useMemo(
    () => [
      t.compose.steps.type,
      t.compose.steps.target,
      t.compose.steps.location,
      t.compose.steps.narrative,
      t.compose.steps.evidence,
      t.compose.steps.review,
    ],
    [t]
  )

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === draft.targetId) ?? null,
    [targets, draft.targetId]
  )
  const selectedAlcaldia = useMemo(
    () => alcaldias.find((loc) => loc.id === draft.locationId) ?? null,
    [alcaldias, draft.locationId]
  )
  const selectedPartner = useMemo(
    () =>
      draft.partnerLocationId
        ? partnerLocations.find(
            (loc) => loc.id === draft.partnerLocationId
          ) ?? null
        : null,
    [partnerLocations, draft.partnerLocationId]
  )

  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-5 sm:p-7">
      <StepProgress
        locale={locale}
        steps={stepLabels}
        currentStep={step}
        onJumpTo={jumpTo}
      />

      {draftRestored && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <span>{t.compose.wizard.draftRestored}</span>
          <button
            type="button"
            onClick={clearDraft}
            className="font-semibold underline hover:text-amber-100"
          >
            {t.compose.wizard.clearDraft}
          </button>
        </div>
      )}

      <div className="mt-6 space-y-6 pb-24 sm:pb-0">
        {step === 0 && (
          <StepType
            locale={locale}
            postType={draft.postType}
            category={draft.category}
            severity={draft.severity}
            errors={errors.type}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          />
        )}

        {step === 1 && (
          <section className="space-y-4">
            <p className="text-sm text-slate-400">{t.compose.targetIntro}</p>
            <TargetPicker
              locale={locale}
              targets={targets}
              selectedId={draft.targetId}
              selectedKind={draft.targetKind}
              onChange={({ id, kind }) =>
                setDraft((d) => ({ ...d, targetId: id, targetKind: kind }))
              }
              error={errors.target?.targetId}
            />
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <p className="text-sm text-slate-400">{t.compose.locationIntro}</p>
            <LocationPicker
              locale={locale}
              alcaldias={alcaldias}
              partnerLocations={partnerLocations}
              selectedAlcaldiaId={draft.locationId}
              refinementMode={draft.refinementMode}
              selectedPartnerLocationId={draft.partnerLocationId}
              streetReference={draft.streetReference}
              onChangeAlcaldia={(id) => {
                // Clear any refinement when the alcaldía changes — the
                // partner list is alcaldía-scoped and a street typed for
                // a different alcaldía is meaningless.
                setDraft((d) => ({
                  ...d,
                  locationId: id,
                  refinementMode: 'none',
                  partnerLocationId: null,
                  streetReference: '',
                }))
              }}
              onChangeRefinementMode={(mode) => {
                setDraft((d) => ({
                  ...d,
                  refinementMode: mode,
                  partnerLocationId: mode === 'partner' ? d.partnerLocationId : null,
                  streetReference: mode === 'street' ? d.streetReference : '',
                }))
              }}
              onChangePartnerLocation={(id) =>
                update('partnerLocationId', id)
              }
              onChangeStreetReference={(value) =>
                update('streetReference', value)
              }
              errors={{
                alcaldia: errors.location?.locationId,
                partner: errors.location?.partnerLocationId,
                street: errors.location?.streetReference,
              }}
            />
          </section>
        )}

        {step === 3 && (
          <StepNarrative
            locale={locale}
            title={draft.title}
            body={draft.body}
            language={draft.language}
            errors={errors.narrative}
            onChangeTitle={(v) => update('title', v)}
            onChangeBody={(v) => update('body', v)}
            onChangeLanguage={(v) => update('language', v)}
          />
        )}

        {step === 4 && (
          <EvidenceUploader
            locale={locale}
            items={draft.evidence}
            onChange={(items) => update('evidence', items)}
          />
        )}

        {step === 5 && (
          <StepReview
            locale={locale}
            draft={draft}
            attestation={attestation}
            onChangeAnonymous={(mode) => update('anonymousMode', mode)}
            onChangeAlias={(v) => update('aliasName', v)}
            onChangeAttestation={setAttestation}
            errors={errors.review}
            target={selectedTarget}
            alcaldia={selectedAlcaldia}
            partner={selectedPartner}
            submitError={submitError}
            onEditStep={(idx) => setStep(idx as Step)}
          />
        )}
      </div>

      <NavBar
        locale={locale}
        step={step}
        totalSteps={TOTAL_STEPS}
        canGoBack={step > 0}
        submitting={submitting}
        onPrev={goPrev}
        onNext={goNext}
        onSubmit={() => void submit()}
      />
    </div>
  )
}

// ===========================================================================
// Step components
// ===========================================================================

function StepType({
  locale,
  postType,
  category,
  severity,
  errors,
  onChange,
}: {
  locale: CitizenSignalsLocale
  postType: SignalPostType
  category: SignalCategory
  severity: SignalSeverity
  errors?: { category?: string; severity?: string }
  onChange: (
    patch: Partial<{
      postType: SignalPostType
      category: SignalCategory
      severity: SignalSeverity
    }>
  ) => void
}) {
  const t = getCitizenSignalsCopy(locale)

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-white">
          {t.compose.steps.type}
        </p>
        <div
          role="radiogroup"
          aria-label={t.compose.steps.type}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          {SIGNAL_POST_TYPES.map((pt) => {
            const choice = t.compose.typeChoices[pt]
            const active = postType === pt
            return (
              <label
                key={pt}
                className={`block cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                  active
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-[#2d3748] hover:border-emerald-400/60'
                }`}
              >
                <input
                  type="radio"
                  name="post_type"
                  value={pt}
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange({ postType: pt })}
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
        <label
          htmlFor="signal-category"
          className="block text-sm font-semibold text-white"
        >
          {t.feed.filters.category}
        </label>
        <select
          id="signal-category"
          value={category}
          onChange={(e) =>
            onChange({ category: e.target.value as SignalCategory })
          }
          className="mt-2 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
        >
          {SIGNAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t.categoryLabel(c)}
            </option>
          ))}
        </select>
        {errors?.category && (
          <p role="alert" className="mt-1 text-xs text-rose-300">
            {errors.category}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-white">
          {t.compose.narrative.severityLabel}
        </p>
        <div
          role="radiogroup"
          aria-label={t.compose.narrative.severityLabel}
          className="mt-2 flex flex-wrap gap-2"
        >
          {SIGNAL_SEVERITIES.map((sev) => {
            const active = severity === sev
            return (
              <button
                key={sev}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ severity: sev })}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? SEVERITY_ACCENTS[sev]
                    : 'border-[#2d3748] text-slate-400 hover:border-emerald-400/60'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${SEVERITY_DOTS[sev]}`}
                />
                {t.severityLabel(sev)}
              </button>
            )
          })}
        </div>
        {errors?.severity && (
          <p role="alert" className="mt-1 text-xs text-rose-300">
            {errors.severity}
          </p>
        )}
      </div>
    </section>
  )
}

function StepNarrative({
  locale,
  title,
  body,
  language,
  errors,
  onChangeTitle,
  onChangeBody,
  onChangeLanguage,
}: {
  locale: CitizenSignalsLocale
  title: string
  body: string
  language: CitizenSignalsLocale
  errors?: { title?: string; body?: string }
  onChangeTitle: (v: string) => void
  onChangeBody: (v: string) => void
  onChangeLanguage: (v: CitizenSignalsLocale) => void
}) {
  const t = getCitizenSignalsCopy(locale)
  const titleErrId = 'signal-title-error'
  const bodyErrId = 'signal-body-error'

  return (
    <section className="space-y-5">
      <div>
        <label
          htmlFor="signal-title"
          className="block text-sm font-semibold text-white"
        >
          {t.compose.narrative.titleLabel}
        </label>
        <input
          id="signal-title"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder={t.compose.narrative.titlePlaceholder}
          aria-invalid={errors?.title ? true : undefined}
          aria-describedby={errors?.title ? titleErrId : undefined}
          className={`mt-2 w-full rounded-lg border bg-[#0f1419] px-3 py-2 text-sm text-slate-100 focus:outline-none ${
            errors?.title
              ? 'border-rose-400'
              : 'border-[#2d3748] focus:border-emerald-400'
          }`}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>{title.trim().length}/120</span>
          {errors?.title && (
            <span id={titleErrId} role="alert" className="text-rose-300">
              {errors.title}
            </span>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="signal-body"
          className="block text-sm font-semibold text-white"
        >
          {t.compose.narrative.bodyLabel}
        </label>
        <textarea
          id="signal-body"
          maxLength={4000}
          rows={8}
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          placeholder={t.compose.narrative.bodyPlaceholder}
          aria-invalid={errors?.body ? true : undefined}
          aria-describedby={errors?.body ? bodyErrId : undefined}
          className={`mt-2 w-full rounded-lg border bg-[#0f1419] px-3 py-2 text-sm text-slate-100 focus:outline-none ${
            errors?.body
              ? 'border-rose-400'
              : 'border-[#2d3748] focus:border-emerald-400'
          }`}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>{body.trim().length}/4000</span>
          {errors?.body && (
            <span id={bodyErrId} role="alert" className="text-rose-300">
              {errors.body}
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-white">
          {t.compose.wizard.languageLabel}
        </p>
        <div
          role="radiogroup"
          aria-label={t.compose.wizard.languageLabel}
          className="mt-2 flex flex-wrap gap-2"
        >
          {(['es', 'en'] as const).map((lang) => {
            const active = language === lang
            return (
              <label
                key={lang}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                    : 'border-[#2d3748] text-slate-400 hover:border-emerald-400/60'
                }`}
              >
                <input
                  type="radio"
                  name="signal-language"
                  className="sr-only"
                  checked={active}
                  onChange={() => onChangeLanguage(lang)}
                />
                {lang === 'es' ? 'Español' : 'English'}
              </label>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function StepReview({
  locale,
  draft,
  attestation,
  onChangeAnonymous,
  onChangeAlias,
  onChangeAttestation,
  errors,
  target,
  alcaldia,
  partner,
  submitError,
  onEditStep,
}: {
  locale: CitizenSignalsLocale
  draft: DraftState
  attestation: boolean
  onChangeAnonymous: (mode: boolean) => void
  onChangeAlias: (v: string) => void
  onChangeAttestation: (v: boolean) => void
  errors?: { aliasName?: string; attestation?: string }
  target: TargetOption | null
  alcaldia: LocationOption | null
  partner: LocationOption | null
  submitError: string | null
  onEditStep: (idx: number) => void
}) {
  const t = getCitizenSignalsCopy(locale)
  const locationCopy = t.compose.location.preview
  const locationSummary = (() => {
    if (!alcaldia) return '—'
    if (draft.refinementMode === 'partner' && partner) {
      return locationCopy.withPartner(alcaldia.name, partner.name)
    }
    if (draft.refinementMode === 'street' && draft.streetReference.trim()) {
      return locationCopy.withStreet(
        alcaldia.name,
        draft.streetReference.trim()
      )
    }
    return locationCopy.alcaldiaOnly(alcaldia.name)
  })()

  const previewRow = (
    label: string,
    value: string,
    stepIdx: number
  ) => (
    <div className="flex items-start justify-between gap-3 border-t border-[#1e2531] py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm text-slate-100">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => onEditStep(stepIdx)}
        className="shrink-0 text-xs text-emerald-300 underline hover:text-emerald-200"
      >
        {t.compose.wizard.editStep}
      </button>
    </div>
  )

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold text-white">
        {t.compose.wizard.previewHeading}
      </h2>

      <div className="rounded-xl border border-[#2d3748] bg-[#0f1419] p-4">
        {previewRow(
          t.compose.steps.type,
          `${t.postTypeLabel(draft.postType)} · ${t.categoryLabel(
            draft.category
          )} · ${t.severityLabel(draft.severity)}`,
          0
        )}
        {previewRow(
          t.detail.target,
          target
            ? `${target.display_name} (${t.targetKindLabel(
                draft.targetKind
              )})`
            : '—',
          1
        )}
        {previewRow(t.detail.location, locationSummary, 2)}
        {previewRow(
          t.compose.narrative.titleLabel,
          draft.title.trim() || '—',
          3
        )}
        {previewRow(
          t.compose.narrative.bodyLabel,
          draft.body.trim() || '—',
          3
        )}
        {previewRow(
          t.detail.evidenceTitle,
          draft.evidence.length > 0
            ? `${draft.evidence.length}`
            : t.detail.noEvidence,
          4
        )}
      </div>

      <div className="rounded-lg border border-[#2d3748] bg-[#0f1419] p-3">
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={draft.anonymousMode}
            onChange={(e) => onChangeAnonymous(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-500"
          />
          <span>
            <span className="font-medium text-white">
              {t.compose.wizard.anonymousToggle}
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">
              {t.compose.wizard.anonymousHelp}
            </span>
          </span>
        </label>
        {draft.anonymousMode && (
          <div className="mt-3">
            <label htmlFor="alias" className="sr-only">
              {t.compose.narrative.aliasLabel}
            </label>
            <input
              id="alias"
              type="text"
              maxLength={60}
              value={draft.aliasName}
              onChange={(e) => onChangeAlias(e.target.value)}
              placeholder={t.compose.wizard.aliasPlaceholder}
              aria-invalid={errors?.aliasName ? true : undefined}
              className={`w-full rounded-lg border bg-[#0b1018] px-3 py-2 text-sm text-slate-100 focus:outline-none ${
                errors?.aliasName
                  ? 'border-rose-400'
                  : 'border-[#2d3748] focus:border-emerald-400'
              }`}
            />
            {errors?.aliasName && (
              <p role="alert" className="mt-1 text-xs text-rose-300">
                {errors.aliasName}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="text-xs uppercase tracking-wide text-amber-300">
          {t.compose.review.legalChecklistTitle}
        </p>
        <p className="mt-2 text-xs text-amber-100/90">
          {t.compose.legalDisclaimerLong}
        </p>
        <label className="mt-3 flex items-start gap-2 text-sm text-amber-50">
          <input
            type="checkbox"
            checked={attestation}
            onChange={(e) => onChangeAttestation(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-500"
            aria-invalid={errors?.attestation ? true : undefined}
          />
          <span>{t.compose.review.attestation}</span>
        </label>
        {errors?.attestation && (
          <p role="alert" className="mt-1 text-xs text-rose-300">
            {errors.attestation}
          </p>
        )}
        <p className="mt-3 text-xs text-amber-100/70">
          <Link href="/terms" className="underline hover:text-amber-50">
            {t.compose.review.termsLink}
          </Link>
        </p>
      </div>

      {submitError && (
        <p
          role="alert"
          className="rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          {submitError}
        </p>
      )}
    </section>
  )
}

function NavBar({
  locale,
  step,
  totalSteps,
  canGoBack,
  submitting,
  onPrev,
  onNext,
  onSubmit,
}: {
  locale: CitizenSignalsLocale
  step: Step
  totalSteps: number
  canGoBack: boolean
  submitting: boolean
  onPrev: () => void
  onNext: () => void
  onSubmit: () => void
}) {
  const t = getCitizenSignalsCopy(locale)
  const isLast = step === totalSteps - 1

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1e2531] bg-[#0f1419]/95 px-4 py-3 backdrop-blur sm:static sm:mt-7 sm:border-t sm:bg-transparent sm:px-0 sm:py-0 sm:pt-5">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoBack || submitting}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-[#2d3748] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-emerald-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← {t.compose.wizard.back}
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {submitting
              ? t.compose.review.submitting
              : t.compose.review.submit}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={submitting}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {t.compose.wizard.next} →
          </button>
        )}
      </div>
    </div>
  )
}
