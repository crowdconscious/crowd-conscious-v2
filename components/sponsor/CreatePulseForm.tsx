'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ImageUpload } from '@/components/ui/ImageUpload'

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
const labelClass = 'text-gray-300 text-sm font-medium block mb-1.5'
const helpClass = 'text-gray-500 text-xs mt-1'

type Props = {
  token: string
  companyName: string
  initialLogoUrl: string | null
}

export default function CreatePulseForm({ token, companyName, initialLogoUrl }: Props) {
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
        setAiError('Respuesta incompleta. Intenta de nuevo.')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (marketId) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="font-medium text-white">Pulse creado correctamente.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/predictions/markets/${marketId}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Ver mercado
          </Link>
          <Link
            href={`/dashboard/sponsor/${token}`}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      ) : null}

      <div>
        <label className={labelClass}>Pregunta / título *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Ej. ¿Cuál debería ser la prioridad #1 para tu equipo?"
          className={inputClass}
        />
      </div>

      {title.trim().length > 10 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">¿Necesitas ayuda formulando tu Pulse?</p>
              <p className="mt-0.5 text-xs text-gray-400">
                La IA puede sugerir contexto, opciones y criterios según tu pregunta.
              </p>
              {aiError ? <p className="mt-2 text-xs text-red-400">{aiError}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => void handleAIAssist()}
              disabled={aiLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Pensando...
                </>
              ) : (
                <>✨ Asistente IA</>
              )}
            </button>
          </div>

          {aiSuggestion ? (
            <div className="mt-4 space-y-3 border-t border-emerald-500/10 pt-4">
              <div className="rounded-lg bg-[#0f1419] p-3">
                <span className="text-xs text-gray-500">Contexto sugerido</span>
                <p className="mt-1 text-sm text-gray-300">{aiSuggestion.context}</p>
              </div>
              <div className="rounded-lg bg-[#0f1419] p-3">
                <span className="text-xs text-gray-500">Opciones sugeridas</span>
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
                <span className="text-xs text-gray-500">Criterio de resolución</span>
                <p className="mt-1 text-sm text-gray-300">{aiSuggestion.resolution_criteria}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyAISuggestion}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                >
                  Aplicar sugerencias
                </button>
                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="rounded-lg border border-[#2d3748] px-4 py-2 text-sm text-gray-400 hover:bg-white/5"
                >
                  Descartar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <label className={labelClass}>Tu logo</label>
        <ImageUpload
          currentUrl={logoUrl.trim() || null}
          onUpload={(url) => setLogoUrl(url)}
          onClear={() => setLogoUrl('')}
          storagePath="sponsors"
          label="Sube tu logo"
          hint="PNG, JPG, WebP · máx. 2MB"
        />
        <p className={helpClass}>Aparece como marca en el Pulse (patrocinador).</p>
      </div>

      <div>
        <label className={labelClass}>Imagen de portada (opcional)</label>
        <ImageUpload
          currentUrl={coverImageUrl.trim() || null}
          onUpload={(url) => setCoverImageUrl(url)}
          onClear={() => setCoverImageUrl('')}
          storagePath="pulse"
          label="Sube imagen de portada"
          hint="Se muestra en la tarjeta del Pulse"
        />
        <p className={helpClass}>Opcional; mejora la presentación en listados y reportes.</p>
      </div>

      <div>
        <label className={labelClass}>Contexto (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Antecedentes y por qué importa esta pregunta."
          className={textareaClass}
        />
      </div>

      <div>
        <label className={labelClass}>Criterio de resolución (opcional)</label>
        <textarea
          value={resolutionCriteria}
          onChange={(e) => setResolutionCriteria(e.target.value)}
          rows={3}
          placeholder="Cómo se determinará el resultado al cerrar el Pulse."
          className={textareaClass}
        />
      </div>

      <div>
        <label className={labelClass}>Fecha de cierre *</label>
        <input
          type="datetime-local"
          value={resolutionDate}
          onChange={(e) => setResolutionDate(e.target.value)}
          required
          className={dateClass}
        />
      </div>

      <div>
        <label className={labelClass}>Opciones (mínimo 2) *</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) => {
                  const next = [...options]
                  next[i] = e.target.value
                  setOptions(next)
                }}
                placeholder={`Opción ${i + 1}`}
                className={`${inputClass} flex-1`}
              />
              {options.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="shrink-0 px-2 text-gray-500 hover:text-red-400"
                  aria-label="Quitar opción"
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {options.length < 6 ? (
          <button
            type="button"
            onClick={() => setOptions([...options, ''])}
            className="mt-2 text-sm text-emerald-400 hover:underline"
          >
            + Agregar opción
          </button>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? 'Creando…' : 'Crear Pulse'}
      </button>
    </form>
  )
}
