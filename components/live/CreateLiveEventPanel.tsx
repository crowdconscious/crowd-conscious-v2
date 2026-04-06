'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PlusCircle } from 'lucide-react'
import {
  EVENT_TYPE_CONFIG,
  type LiveEventTypeKey,
  suggestedQuestionsPayload,
} from '@/lib/live-event-types'
import { DEFAULT_LIVE_EVENT_DURATION_MINUTES } from '@/lib/live-event-default-durations'
import { LiveEventDurationField } from '@/components/live/LiveEventDurationField'
import { LogoUpload } from '@/components/ui/LogoUpload'
import { ImageUpload } from '@/components/ui/ImageUpload'

function CoverImageField({
  label,
  value,
  onChange,
  es,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  es: boolean
}) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      <ImageUpload
        currentUrl={value.trim() || null}
        onUpload={onChange}
        storagePath="live"
        label={es ? 'Sube imagen de portada' : 'Upload cover image'}
        hint={es ? 'PNG, JPG, WebP · máx. 2MB' : 'PNG, JPG, WebP · max 2MB'}
      />
    </div>
  )
}

function SponsorLogoField({
  label,
  value,
  onChange,
  es,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  es: boolean
}) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      <LogoUpload
        currentLogoUrl={value.trim() || null}
        onUpload={onChange}
        label={es ? 'Sube logo' : 'Upload logo'}
        hint={es ? 'PNG, JPG, WebP · máx. 2MB' : 'PNG, JPG, WebP · max 2MB'}
      />
    </div>
  )
}

export interface CreateLiveEventPanelProps {
  locale: 'en' | 'es'
}

const INPUT_CLASS =
  'min-h-[44px] w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none'

export function CreateLiveEventPanel({ locale }: CreateLiveEventPanelProps) {
  const router = useRouter()
  const es = locale === 'es'
  const [selectedType, setSelectedType] = useState<LiveEventTypeKey | null>(null)

  const [title, setTitle] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [sponsorName, setSponsorName] = useState('')
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [teamAName, setTeamAName] = useState('')
  const [teamAFlag, setTeamAFlag] = useState('')
  const [teamBName, setTeamBName] = useState('')
  const [teamBFlag, setTeamBFlag] = useState('')
  const [brandName, setBrandName] = useState('')
  const [brandLogoUrl, setBrandLogoUrl] = useState('')
  const [productPartnerSponsor, setProductPartnerSponsor] = useState('')
  const [speakerName, setSpeakerName] = useState('')
  const [showName, setShowName] = useState('')
  const [organizerName, setOrganizerName] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(120)

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copyFlash, setCopyFlash] = useState<string | null>(null)

  useEffect(() => {
    if (selectedType) {
      setDurationMinutes(DEFAULT_LIVE_EVENT_DURATION_MINUTES[selectedType])
    }
  }, [selectedType])

  const t = es
    ? {
        heading: 'Crear evento en vivo',
        hint: 'Elige el tipo de evento y completa los detalles; los espectadores lo verán en la lista.',
        step1: '¿Qué tipo de evento en vivo?',
        changeType: 'Cambiar tipo',
        submit: 'Crear evento',
        required: 'Título y fecha son obligatorios.',
        suggestionsTitle: 'Preguntas sugeridas para el evento',
        suggestionsHint:
          'Haz clic para copiar y crear como micro-mercado durante el evento',
        fields: {
          matchTitle: 'Título del partido',
          eventTitle: 'Título del evento',
          kickoffDate: 'Fecha y hora del partido',
          startDate: 'Fecha y hora de inicio',
          youtube: 'URL de YouTube (opcional)',
          sponsor: 'Patrocinador del evento (opcional)',
          sponsorLogo: 'URL logo del patrocinador (opcional)',
          cover: 'Imagen de portada (opcional)',
          teamA: 'Equipo A — nombre',
          teamAFlag: 'Equipo A — emoji o URL de bandera',
          teamB: 'Equipo B — nombre',
          teamBFlag: 'Equipo B — emoji o URL de bandera',
          brandName: 'Nombre de la marca',
          brandLogo: 'URL logo de la marca',
          partnerExtra: 'Socio / patrocinador adicional (opcional)',
          speaker: 'Orador(a) o figura principal',
          show: 'Nombre del show / estreno',
          organizer: 'Organizador',
        },
      }
    : {
        heading: 'Create live event',
        hint: 'Pick an event type and fill in details; it will appear in the live list.',
        step1: 'What kind of live event?',
        changeType: 'Change type',
        submit: 'Create event',
        required: 'Title and date are required.',
        suggestionsTitle: 'Suggested questions for the event',
        suggestionsHint: 'Click to copy and add as a micro-market during the event',
        fields: {
          matchTitle: 'Match title',
          eventTitle: 'Event title',
          kickoffDate: 'Kickoff date & time',
          startDate: 'Start date & time',
          youtube: 'YouTube URL (optional)',
          sponsor: 'Event sponsor (optional)',
          sponsorLogo: 'Sponsor logo URL (optional)',
          cover: 'Cover image (optional)',
          teamA: 'Team A — name',
          teamAFlag: 'Team A — emoji or flag URL',
          teamB: 'Team B — name',
          teamBFlag: 'Team B — emoji or flag URL',
          brandName: 'Brand name',
          brandLogo: 'Brand logo URL',
          partnerExtra: 'Additional partner / sponsor (optional)',
          speaker: 'Speaker or main figure',
          show: 'Show / premiere name',
          organizer: 'Organizer',
        },
      }

  const copyToClipboard = useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text).then(() => {
        setCopyFlash(text)
        setTimeout(() => setCopyFlash(null), 1500)
      })
    },
    []
  )

  const resetTypeSpecific = useCallback(() => {
    setTitle('')
    setMatchDate('')
    setYoutubeUrl('')
    setSponsorName('')
    setSponsorLogoUrl('')
    setCoverImageUrl('')
    setTeamAName('')
    setTeamAFlag('')
    setTeamBName('')
    setTeamBFlag('')
    setBrandName('')
    setBrandLogoUrl('')
    setProductPartnerSponsor('')
    setSpeakerName('')
    setShowName('')
    setOrganizerName('')
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType) return
    setErr(null)
    if (!title.trim() || !matchDate) {
      setErr(t.required)
      return
    }
    const match_date = new Date(matchDate).toISOString()
    const sq = suggestedQuestionsPayload(selectedType)

    let event_subtype: string | null = null
    let description: string | null = null
    let payloadSponsorName: string | null = sponsorName.trim() || null
    let payloadSponsorLogo: string | null = sponsorLogoUrl.trim() || null

    if (selectedType === 'product_launch') {
      payloadSponsorName = brandName.trim() || null
      payloadSponsorLogo = brandLogoUrl.trim() || null
      if (productPartnerSponsor.trim()) {
        description = productPartnerSponsor.trim()
      }
    } else if (selectedType === 'government_conference') {
      event_subtype = speakerName.trim() || null
    } else if (selectedType === 'entertainment') {
      event_subtype = showName.trim() || null
    } else if (selectedType === 'community_event') {
      event_subtype = organizerName.trim() || null
    }

    setBusy(true)
    try {
      const res = await fetch('/api/live/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          match_date,
          event_type: selectedType,
          event_subtype,
          suggested_questions: sq,
          description: description ?? undefined,
          youtube_url: youtubeUrl.trim() || undefined,
          sponsor_name: payloadSponsorName ?? undefined,
          sponsor_logo_url: payloadSponsorLogo ?? undefined,
          cover_image_url: coverImageUrl.trim() || undefined,
          team_a_name: selectedType === 'soccer_match' ? teamAName.trim() || undefined : undefined,
          team_a_flag: selectedType === 'soccer_match' ? teamAFlag.trim() || undefined : undefined,
          team_b_name: selectedType === 'soccer_match' ? teamBName.trim() || undefined : undefined,
          team_b_flag: selectedType === 'soccer_match' ? teamBFlag.trim() || undefined : undefined,
          duration_minutes: durationMinutes,
        }),
      })
      const json = (await res.json()) as { error?: string; event?: { id: string } }
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed')
      const id = json.event?.id
      if (id) router.push(`/live/${id}`)
      else router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const suggestions =
    selectedType && EVENT_TYPE_CONFIG[selectedType].suggestedQuestions[locale].length > 0
      ? EVENT_TYPE_CONFIG[selectedType].suggestedQuestions[locale]
      : []

  return (
    <div className="mb-8 rounded-2xl border border-teal-500/30 bg-slate-900/70 p-5 shadow-lg shadow-black/30">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
          <PlusCircle className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">{t.heading}</h2>
          <p className="mt-1 text-sm text-slate-400">{t.hint}</p>
        </div>
      </div>

      {!selectedType ? (
        <div>
          <p className="mb-4 text-center text-sm font-medium text-slate-300">{t.step1}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(EVENT_TYPE_CONFIG) as LiveEventTypeKey[]).map((key) => {
              const cfg = EVENT_TYPE_CONFIG[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    resetTypeSpecific()
                    setSelectedType(key)
                  }}
                  className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-4 text-left transition-colors hover:border-emerald-500/50"
                >
                  <span className="text-2xl">{cfg.icon}</span>
                  <h3 className="mt-2 font-medium text-white">{cfg.label[locale]}</h3>
                  <p className="mt-1 text-xs text-slate-500">{cfg.description[locale]}</p>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setSelectedType(null)
              setErr(null)
            }}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← {t.changeType}
          </button>

          {selectedType === 'soccer_match' && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.matchTitle}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={es ? 'Ej. México vs Alemania' : 'e.g. Mexico vs Germany'}
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.kickoffDate}</span>
                <input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <LiveEventDurationField
                value={durationMinutes}
                onChange={setDurationMinutes}
                locale={locale}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.youtube}</span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.sponsor}</span>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <SponsorLogoField
                label={t.fields.sponsorLogo}
                value={sponsorLogoUrl}
                onChange={setSponsorLogoUrl}
                es={es}
              />
              <CoverImageField
                label={t.fields.cover}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                es={es}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm text-slate-400">{t.fields.teamA}</span>
                  <input
                    value={teamAName}
                    onChange={(e) => setTeamAName(e.target.value)}
                    className={`${INPUT_CLASS} mb-2`}
                    placeholder={es ? 'Nombre' : 'Name'}
                  />
                  <input
                    value={teamAFlag}
                    onChange={(e) => setTeamAFlag(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="🇲🇽"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-slate-400">{t.fields.teamB}</span>
                  <input
                    value={teamBName}
                    onChange={(e) => setTeamBName(e.target.value)}
                    className={`${INPUT_CLASS} mb-2`}
                    placeholder={es ? 'Nombre' : 'Name'}
                  />
                  <input
                    value={teamBFlag}
                    onChange={(e) => setTeamBFlag(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="🇩🇪"
                  />
                </label>
              </div>
            </>
          )}

          {selectedType === 'product_launch' && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.eventTitle}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={INPUT_CLASS}
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.startDate}</span>
                <input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <LiveEventDurationField
                value={durationMinutes}
                onChange={setDurationMinutes}
                locale={locale}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.youtube}</span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.brandName}</span>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <SponsorLogoField
                label={t.fields.brandLogo}
                value={brandLogoUrl}
                onChange={setBrandLogoUrl}
                es={es}
              />
              <CoverImageField
                label={t.fields.cover}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                es={es}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.partnerExtra}</span>
                <input
                  type="text"
                  value={productPartnerSponsor}
                  onChange={(e) => setProductPartnerSponsor(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
            </>
          )}

          {selectedType === 'government_conference' && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.eventTitle}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.speaker}</span>
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.startDate}</span>
                <input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <LiveEventDurationField
                value={durationMinutes}
                onChange={setDurationMinutes}
                locale={locale}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.youtube}</span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <CoverImageField
                label={t.fields.cover}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                es={es}
              />
            </>
          )}

          {selectedType === 'entertainment' && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.eventTitle}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.show}</span>
                <input
                  type="text"
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.startDate}</span>
                <input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <LiveEventDurationField
                value={durationMinutes}
                onChange={setDurationMinutes}
                locale={locale}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.youtube}</span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <CoverImageField
                label={t.fields.cover}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                es={es}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.sponsor}</span>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <SponsorLogoField
                label={t.fields.sponsorLogo}
                value={sponsorLogoUrl}
                onChange={setSponsorLogoUrl}
                es={es}
              />
            </>
          )}

          {selectedType === 'community_event' && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.eventTitle}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.organizer}</span>
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.startDate}</span>
                <input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <LiveEventDurationField
                value={durationMinutes}
                onChange={setDurationMinutes}
                locale={locale}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.youtube}</span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <CoverImageField
                label={t.fields.cover}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                es={es}
              />
            </>
          )}

          {selectedType === 'custom' && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.eventTitle}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.startDate}</span>
                <input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <LiveEventDurationField
                value={durationMinutes}
                onChange={setDurationMinutes}
                locale={locale}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.youtube}</span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <CoverImageField
                label={t.fields.cover}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                es={es}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-300">{t.fields.sponsor}</span>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <SponsorLogoField
                label={t.fields.sponsorLogo}
                value={sponsorLogoUrl}
                onChange={setSponsorLogoUrl}
                es={es}
              />
            </>
          )}

          {suggestions.length > 0 && (
            <div className="mt-6 border-t border-[#2d3748] pt-4">
              <h3 className="mb-1 text-sm font-medium text-white">{t.suggestionsTitle}</h3>
              <p className="mb-3 text-xs text-gray-500">{t.suggestionsHint}</p>
              <ul className="space-y-1">
                {suggestions.map((q, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(q)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
                    >
                      💡 {q}
                      {copyFlash === q ? (
                        <span className="ml-2 text-xs text-emerald-400">
                          {es ? 'Copiado' : 'Copied'}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {err && (
            <p className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-200" role="alert">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t.submit}
          </button>
        </form>
      )}
    </div>
  )
}
