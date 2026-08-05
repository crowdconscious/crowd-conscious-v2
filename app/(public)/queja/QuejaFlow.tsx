'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { getOrCreateGuestId } from '@/lib/guest-vote-storage'
import { getQuejaCopy } from '@/lib/senal-express/i18n'
import {
  EXPRESS_CATEGORIES,
  EXPRESS_CATEGORY_LABELS,
  type ExpressCategory,
} from '@/lib/senal-express/category-map'
import {
  LAUNCH_ALCALDIAS,
  resolveAlcaldia,
  resolveColonia,
  type LaunchAlcaldia,
} from '@/lib/geo/cdmx'
import { trackQuejaEvent } from '@/lib/senal-express/analytics'
import { withShareUtm, trackShare } from '@/lib/share-utils'
import type {
  DraftDestinatario,
  DraftResponseBody,
  ConfirmResponseBody,
} from '@/lib/senal-express/types'

type Step = 'photo' | 'location' | 'describe' | 'review' | 'done'
const STEP_ORDER: Step[] = ['photo', 'location', 'describe', 'review']

interface QuejaFlowProps {
  isLoggedIn: boolean
  userName: string | null
}

export default function QuejaFlow({ isLoggedIn, userName }: QuejaFlowProps) {
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const t = getQuejaCopy(locale)

  const [step, setStep] = useState<Step>('photo')
  const flowStartedRef = useRef(false)

  // Step 1 — photo (optional)
  const [uploading, setUploading] = useState(false)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [photoNote, setPhotoNote] = useState<string | null>(null)

  // Step 2 — location
  const [alcaldia, setAlcaldia] = useState<LaunchAlcaldia | ''>('')
  const [colonia, setColonia] = useState('')
  const [streetReference, setStreetReference] = useState('')
  const [locating, setLocating] = useState(false)
  const [geoNote, setGeoNote] = useState<string | null>(null)

  // Step 3 — describe
  const [sentence, setSentence] = useState('')
  const [category, setCategory] = useState<ExpressCategory | ''>('')
  const [generating, setGenerating] = useState(false)

  // Step 4 — review
  const [oficioId, setOficioId] = useState<string | null>(null)
  const [destinatario, setDestinatario] = useState<DraftDestinatario | null>(null)
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [peticion, setPeticion] = useState('')
  const [senderName, setSenderName] = useState(userName ?? '')
  const [confirming, setConfirming] = useState(false)

  // Done
  const [result, setResult] = useState<ConfirmResponseBody | null>(null)
  const [copied, setCopied] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    trackQuejaEvent('queja_landing_view', { locale })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markFlowStarted = useCallback(() => {
    if (!flowStartedRef.current) {
      flowStartedRef.current = true
      trackQuejaEvent('queja_flow_start', { locale })
    }
  }, [locale])

  const stepIndex = STEP_ORDER.indexOf(step === 'done' ? 'review' : step)

  // --- Step 1: photo upload -------------------------------------------------
  const handlePhoto = useCallback(
    async (file: File) => {
      setPhotoNote(null)
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/signals/upload', {
          method: 'POST',
          body: fd,
        })
        if (res.ok) {
          const data = (await res.json()) as { storage_path?: string }
          if (data.storage_path) {
            setPhotoPath(data.storage_path)
            setPhotoName(file.name)
          }
        } else if (res.status === 401 || res.status === 404) {
          // Anonymous / signals-off: photo is optional — continue gracefully.
          setPhotoNote(t.flow.photo.anonNote)
        } else {
          setPhotoNote(t.flow.errors.draftFailed)
        }
      } catch {
        setPhotoNote(t.flow.errors.draftFailed)
      } finally {
        setUploading(false)
      }
    },
    [t]
  )

  // --- Step 2: geolocation --------------------------------------------------
  const useMyLocation = useCallback(() => {
    setGeoNote(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoNote(t.flow.location.locationDenied)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const { latitude, longitude } = pos.coords
        const a = resolveAlcaldia(latitude, longitude)
        if (a) {
          setAlcaldia(a)
          const c = resolveColonia(latitude, longitude)
          if (c && !colonia) setColonia(c)
        } else {
          setGeoNote(t.flow.location.locationDenied)
        }
      },
      () => {
        setLocating(false)
        setGeoNote(t.flow.location.locationDenied)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  }, [colonia, t])

  // --- Step 3: generate draft ----------------------------------------------
  const generateDraft = useCallback(async () => {
    setFieldError(null)
    setError(null)
    if (sentence.trim().length < 15) {
      setFieldError(t.flow.describe.sentenceTooShort)
      return
    }
    if (!category) {
      setFieldError(t.flow.describe.categoryRequired)
      return
    }
    if (!alcaldia) {
      setStep('location')
      setFieldError(t.flow.location.alcaldiaRequired)
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/senal-express/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          deviceId: getOrCreateGuestId(),
          alcaldia,
          category,
          sentence: sentence.trim(),
          colonia: colonia.trim() || null,
          streetReference: streetReference.trim() || null,
          hasPhoto: Boolean(photoPath),
          locale,
        }),
      })
      if (res.status === 429) {
        setError(t.flow.errors.rateLimited)
        return
      }
      if (res.status === 503) {
        setError(t.flow.errors.disabled)
        return
      }
      if (!res.ok) {
        setError(t.flow.errors.draftFailed)
        return
      }
      const data = (await res.json()) as DraftResponseBody
      setOficioId(data.oficioId)
      setDestinatario(data.destinatario)
      setAsunto(data.draft.asunto)
      setCuerpo(data.draft.cuerpo_parrafos.join('\n\n'))
      setPeticion(data.draft.peticion)
      trackQuejaEvent('queja_draft_ready', { locale, alcaldia, category })
      setStep('review')
    } catch {
      setError(t.flow.errors.draftFailed)
    } finally {
      setGenerating(false)
    }
  }, [
    sentence,
    category,
    alcaldia,
    colonia,
    streetReference,
    photoPath,
    locale,
    t,
  ])

  // --- Step 4: confirm ------------------------------------------------------
  const downloadPdf = useCallback((url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = 'oficio-crowdconscious.pdf'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [])

  const confirmOficio = useCallback(async () => {
    if (!oficioId) return
    setError(null)
    setConfirming(true)
    try {
      const res = await fetch('/api/senal-express/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          oficioId,
          deviceId: getOrCreateGuestId(),
          senderName: senderName.trim() || null,
          asunto: asunto.trim(),
          cuerpo: cuerpo.trim(),
          peticion: peticion.trim(),
          colonia: colonia.trim() || null,
          streetReference: streetReference.trim() || null,
          photoStoragePath: photoPath,
          locale,
        }),
      })
      if (!res.ok) {
        setError(t.flow.errors.confirmFailed)
        return
      }
      const data = (await res.json()) as ConfirmResponseBody
      setResult(data)
      downloadPdf(data.pdfUrl)
      trackQuejaEvent('queja_pdf_download', { locale, alcaldia: alcaldia || null })
      if (data.signalCreated) {
        trackQuejaEvent('queja_senal_created', {
          locale,
          alcaldia: alcaldia || null,
          signalCreated: true,
        })
      }
      setStep('done')
    } catch {
      setError(t.flow.errors.confirmFailed)
    } finally {
      setConfirming(false)
    }
  }, [
    oficioId,
    senderName,
    asunto,
    cuerpo,
    peticion,
    colonia,
    streetReference,
    photoPath,
    locale,
    alcaldia,
    downloadPdf,
    t,
  ])

  // --- Share (done) ---------------------------------------------------------
  const signalUrl =
    result?.signalSlug && typeof window !== 'undefined'
      ? withShareUtm(
          `${window.location.origin}/signals/${result.signalSlug}`,
          'whatsapp'
        )
      : null

  const shareWhatsApp = useCallback(() => {
    if (!signalUrl || !result?.signalSlug) return
    trackShare(
      { type: 'other', otherType: 'senal_express', otherId: result.signalSlug },
      'whatsapp',
      'queja',
      'link'
    )
    const text = t.flow.shareMessage(signalUrl)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }, [signalUrl, result, t])

  const copyLink = useCallback(async () => {
    if (!signalUrl) return
    try {
      await navigator.clipboard.writeText(signalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [signalUrl])

  const resetFlow = useCallback(() => {
    setStep('photo')
    setPhotoPath(null)
    setPhotoName(null)
    setPhotoNote(null)
    setAlcaldia('')
    setColonia('')
    setStreetReference('')
    setGeoNote(null)
    setSentence('')
    setCategory('')
    setOficioId(null)
    setDestinatario(null)
    setAsunto('')
    setCuerpo('')
    setPeticion('')
    setResult(null)
    setError(null)
    setFieldError(null)
  }, [])

  // --- Rendering ------------------------------------------------------------
  const card =
    'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'
  const primaryBtn =
    'inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-6 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'
  const secondaryBtn =
    'inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 font-medium text-slate-700 transition-colors hover:bg-slate-50'
  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'

  function StepHeader() {
    if (step === 'done') return null
    return (
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          {t.flow.stepLabel(stepIndex + 1, STEP_ORDER.length)}
        </span>
        <div className="flex gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 w-8 rounded-full ${
                i <= stepIndex ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={card} id="queja-flow">
      <StepHeader />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1 — Photo */}
      {step === 'photo' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            {t.flow.photo.title}
          </h2>
          <p className="text-sm text-slate-600">{t.flow.photo.help}</p>

          {photoPath ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="truncate text-sm text-emerald-800">
                {t.flow.photo.uploaded}
                {photoName ? `: ${photoName}` : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPhotoPath(null)
                  setPhotoName(null)
                }}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                {t.flow.photo.remove}
              </button>
            </div>
          ) : (
            <label className={`${secondaryBtn} w-full cursor-pointer`}>
              {uploading ? t.flow.photo.uploading : t.flow.photo.choose}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handlePhoto(f)
                }}
              />
            </label>
          )}

          {photoNote && <p className="text-sm text-amber-700">{photoNote}</p>}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              className={primaryBtn}
              onClick={() => {
                markFlowStarted()
                setStep('location')
              }}
            >
              {t.flow.next}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Location */}
      {step === 'location' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            {t.flow.location.title}
          </h2>

          <button type="button" className={secondaryBtn} onClick={useMyLocation}>
            {locating ? t.flow.location.locating : t.flow.location.useLocation}
          </button>
          {geoNote && <p className="text-sm text-amber-700">{geoNote}</p>}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.location.alcaldiaLabel}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {LAUNCH_ALCALDIAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAlcaldia(a)}
                  className={`min-h-[48px] rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    alcaldia === a
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.location.coloniaLabel}
            </label>
            <input
              className={inputCls}
              value={colonia}
              onChange={(e) => setColonia(e.target.value)}
              placeholder={t.flow.location.coloniaPlaceholder}
              maxLength={120}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.location.streetLabel}
            </label>
            <input
              className={inputCls}
              value={streetReference}
              onChange={(e) => setStreetReference(e.target.value)}
              placeholder={t.flow.location.streetPlaceholder}
              maxLength={160}
            />
          </div>

          {fieldError && <p className="text-sm text-red-600">{fieldError}</p>}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => setStep('photo')}
            >
              {t.flow.back}
            </button>
            <button
              type="button"
              className={primaryBtn}
              onClick={() => {
                if (!alcaldia) {
                  setFieldError(t.flow.location.alcaldiaRequired)
                  return
                }
                setFieldError(null)
                setStep('describe')
              }}
            >
              {t.flow.next}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Describe */}
      {step === 'describe' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            {t.flow.describe.title}
          </h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.describe.sentenceLabel}
            </label>
            <textarea
              className={`${inputCls} min-h-[96px] resize-y`}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder={t.flow.describe.sentencePlaceholder}
              maxLength={400}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t.flow.describe.sentenceHint}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.describe.categoryLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              {EXPRESS_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    category === c
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {EXPRESS_CATEGORY_LABELS[c][locale]}
                </button>
              ))}
            </div>
          </div>

          {fieldError && <p className="text-sm text-red-600">{fieldError}</p>}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => setStep('location')}
            >
              {t.flow.back}
            </button>
            <button
              type="button"
              className={primaryBtn}
              onClick={generateDraft}
              disabled={generating}
            >
              {generating
                ? t.flow.describe.generating
                : t.flow.describe.generate}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 'review' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            {t.flow.review.title}
          </h2>
          <p className="text-sm text-slate-600">{t.flow.review.help}</p>

          {destinatario && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium text-slate-500">
                {t.flow.review.destinatarioLabel}:{' '}
              </span>
              <span className="text-slate-800">
                {destinatario.titulo} — {destinatario.dependencia}
              </span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.review.senderLabel}
            </label>
            <input
              className={inputCls}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={t.flow.review.senderPlaceholder}
              maxLength={120}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t.flow.review.senderHelp}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.review.asuntoLabel}
            </label>
            <input
              className={inputCls}
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              maxLength={300}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.review.cuerpoLabel}
            </label>
            <textarea
              className={`${inputCls} min-h-[180px] resize-y`}
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              maxLength={8000}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.flow.review.peticionLabel}
            </label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={peticion}
              onChange={(e) => setPeticion(e.target.value)}
              maxLength={2000}
            />
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => setStep('describe')}
            >
              {t.flow.back}
            </button>
            <button
              type="button"
              className={primaryBtn}
              onClick={confirmOficio}
              disabled={confirming}
            >
              {confirming
                ? t.flow.review.confirming
                : isLoggedIn
                  ? t.flow.review.confirmLoggedIn
                  : t.flow.review.confirmAnon}
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && result && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              ✓
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {t.flow.done.title}
            </h2>
          </div>

          <p className="text-sm text-slate-600">{t.flow.done.pdfReady}</p>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => downloadPdf(result.pdfUrl)}
          >
            {t.flow.done.downloadAgain}
          </button>

          {result.signalCreated && result.signalSlug && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800">
                {t.flow.done.signalCreated}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/signals/${result.signalSlug}`}
                  className={secondaryBtn}
                >
                  {t.flow.done.viewSignal}
                </Link>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={shareWhatsApp}
                >
                  {t.flow.done.shareWhatsApp}
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={copyLink}
                >
                  {copied ? t.flow.done.copied : t.flow.done.copyLink}
                </button>
              </div>
            </div>
          )}

          {result.publishUnavailable && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t.flow.done.publishUnavailable}
            </p>
          )}

          {!isLoggedIn && !result.signalCreated && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">
                {t.flow.done.registerTitle}
              </h3>
              <p className="text-sm text-slate-600">{t.flow.done.registerBody}</p>
              <Link href="/signup" className={primaryBtn}>
                {t.flow.done.registerCta}
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={resetFlow}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            {t.flow.done.startAnother}
          </button>
        </div>
      )}
    </div>
  )
}
