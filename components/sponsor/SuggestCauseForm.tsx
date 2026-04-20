'use client'

import { useState } from 'react'
import { HeartHandshake } from 'lucide-react'

/**
 * SuggestCauseForm — lives inside the token-authed sponsor dashboard so
 * municipalities and brands can nominate a local nonprofit to receive a
 * future cycle of the Conscious Fund without being granted write access
 * to `fund_causes`.
 *
 * Submissions land in `conscious_inbox` with type
 * `cause_suggestion_municipal` (see migrations 205 + 206). An admin
 * reviews, verifies, and then promotes the row to `fund_causes` from
 * `/predictions/admin/inbox` + `/predictions/admin/causes`.
 */
export function SuggestCauseForm({ token }: { token: string }) {
  const [name, setName] = useState('')
  const [organization, setOrganization] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [why, setWhy] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setStatus('idle')
    setErrorMessage(null)
    try {
      const res = await fetch('/api/inbox/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cause_suggestion_municipal',
          sponsor_token: token,
          name: name.trim(),
          organization: organization.trim(),
          website_url: websiteUrl.trim(),
          why: why.trim(),
          submitter_email: email.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMessage(data.error || 'Algo salió mal')
      } else {
        setStatus('ok')
        setName('')
        setOrganization('')
        setWebsiteUrl('')
        setWhy('')
        setEmail('')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
      <div className="flex items-start gap-3 mb-4">
        <HeartHandshake className="h-5 w-5 text-emerald-400 mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-white">
            Sugerir una causa para el Fondo
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Nomina una organización local verificable. Revisamos cada sugerencia
            manualmente; aprobarla no es automático. Agradecemos a los
            municipios y patrocinadores que amplían la red de causas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
              Nombre de la causa *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              placeholder="Aquí Nadie Se Rinde"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
              Organización *
            </label>
            <input
              type="text"
              required
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              placeholder="Aquí Nadie Se Rinde A.C."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
            Sitio web oficial * (https)
          </label>
          <input
            type="url"
            required
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
            Por qué merece un ciclo *
          </label>
          <textarea
            required
            rows={4}
            value={why}
            onChange={(e) => setWhy(e.target.value.slice(0, 4000))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white resize-none"
            placeholder="¿Qué hacen, a quién benefician, y por qué encaja con la comunidad de Crowd Conscious?"
            maxLength={4000}
          />
          <p className="text-xs text-slate-500 mt-1">{why.length}/4000</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
            Tu email (opcional, para confirmar la aprobación)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
            placeholder="contacto@municipio.mx"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Enviar sugerencia'}
          </button>
          {status === 'ok' && (
            <span className="text-sm text-emerald-400">
              ✓ Recibido. Te avisamos si la aprobamos.
            </span>
          )}
          {status === 'error' && errorMessage && (
            <span className="text-sm text-red-400">✗ {errorMessage}</span>
          )}
        </div>
      </form>
    </section>
  )
}
