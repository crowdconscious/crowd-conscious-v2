'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PlusCircle } from 'lucide-react'

export interface CreateLiveEventPanelProps {
  locale: 'en' | 'es'
}

export function CreateLiveEventPanel({ locale }: CreateLiveEventPanelProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [sponsorName, setSponsorName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const t =
    locale === 'es'
      ? {
          heading: 'Crear evento en vivo',
          hint: 'Los espectadores verán este evento en la lista; puedes ponerlo en vivo desde la página del partido.',
          title: 'Título del partido',
          match: 'Fecha y hora del partido',
          youtube: 'URL de YouTube (opcional)',
          sponsor: 'Patrocinador del evento (opcional)',
          submit: 'Crear evento',
          required: 'Título y fecha son obligatorios.',
        }
      : {
          heading: 'Create live event',
          hint: 'The event appears in this list; use the match page to go live and add micro-markets.',
          title: 'Match title',
          match: 'Kickoff date & time',
          youtube: 'YouTube URL (optional)',
          sponsor: 'Event sponsor (optional)',
          submit: 'Create event',
          required: 'Title and date are required.',
        }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!title.trim() || !matchDate) {
      setErr(t.required)
      return
    }
    const match_date = new Date(matchDate).toISOString()
    setBusy(true)
    try {
      const res = await fetch('/api/live/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          match_date,
          youtube_url: youtubeUrl.trim() || undefined,
          sponsor_name: sponsorName.trim() || undefined,
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

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">{t.title}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600"
            placeholder={locale === 'es' ? 'Ej. México vs Alemania' : 'e.g. Mexico vs Germany'}
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">{t.match}</span>
          <input
            type="datetime-local"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">{t.youtube}</span>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">{t.sponsor}</span>
          <input
            type="text"
            value={sponsorName}
            onChange={(e) => setSponsorName(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
        </label>

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
    </div>
  )
}
