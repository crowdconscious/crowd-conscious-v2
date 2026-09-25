'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  CONSENT_TEXT_ES,
  HOW_KNOWN,
  HOW_KNOWN_LABELS_ES,
  MAX_CONTACT_LEN,
  MAX_CREDIT_LEN,
  MAX_WHAT_LEN,
  MAX_WHERE_LEN,
  WHO_TYPES,
  WHO_TYPE_LABELS_ES,
  type HowKnown,
  type WhoType,
} from '@/lib/reconocimientos/constants'

type Props = {
  src: string
}

export default function ReconoceForm({ src }: Props) {
  const [what, setWhat] = useState('')
  const [whereText, setWhereText] = useState('')
  const [whoType, setWhoType] = useState<WhoType | ''>('')
  const [howKnown, setHowKnown] = useState<HowKnown | ''>('')
  const [creditHandle, setCreditHandle] = useState('')
  const [contact, setContact] = useState('')
  const [consent, setConsent] = useState(false)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const photo = photoRef.current?.files?.[0]
    if (!photo) {
      setError('La foto es obligatoria')
      return
    }
    if (!what.trim() || !whereText.trim() || !whoType || !howKnown) {
      setError('Completa los campos requeridos')
      return
    }
    if (!consent) {
      setError('Debes aceptar el consentimiento')
      return
    }

    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('photo', photo)
      form.set('what', what.trim())
      form.set('where_text', whereText.trim())
      form.set('who_type', whoType)
      form.set('how_known', howKnown)
      if (creditHandle.trim()) form.set('credit_handle', creditHandle.trim())
      if (contact.trim()) form.set('contact', contact.trim())
      form.set('consent', 'true')
      form.set('src', src)
      // Honeypot — leave empty
      form.set('website', '')

      const res = await fetch('/api/reconocimientos/submit', {
        method: 'POST',
        body: form,
      })
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
      } | null

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'No se pudo enviar. Intenta de nuevo.')
        return
      }
      setDone(true)
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-8 text-center">
        <h2 className="text-xl font-semibold text-white">¡Gracias!</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Lo revisamos y, si cumple, lo compartimos.
        </p>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Reglas: foto propia o con permiso, sin menores identificables, sin
          contenido engañoso ni ofensivo. Si ves algo que no debería estar
          publicado, reporta en{' '}
          <Link href="/signals" className="text-emerald-400 underline-offset-2 hover:underline">
            Señales
          </Link>
          .
        </p>
        <Link
          href="/reconocimientos"
          className="mt-6 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          Ver reconocimientos publicados
        </Link>
      </div>
    )
  }

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-slate-700 bg-[#151c26] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40'
  const labelClass = 'block text-sm font-medium text-slate-200'

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {/* Honeypot */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className={labelClass}>
          Foto <span className="text-emerald-400">*</span>
        </label>
        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          required
          className="mt-1.5 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-300"
          onChange={(ev) => {
            const f = ev.target.files?.[0]
            setPhotoName(f ? f.name : null)
          }}
        />
        {photoName && (
          <p className="mt-1 text-xs text-slate-500">{photoName}</p>
        )}
      </div>

      <div>
        <label htmlFor="what" className={labelClass}>
          ¿Qué está pasando? <span className="text-emerald-400">*</span>
        </label>
        <textarea
          id="what"
          value={what}
          onChange={(e) => setWhat(e.target.value.slice(0, MAX_WHAT_LEN))}
          maxLength={MAX_WHAT_LEN}
          rows={3}
          required
          placeholder="Describe lo bueno que viste…"
          className={fieldClass}
        />
        <p className="mt-1 text-right text-xs text-slate-500">
          {what.length}/{MAX_WHAT_LEN}
        </p>
      </div>

      <div>
        <label htmlFor="where_text" className={labelClass}>
          ¿Dónde? <span className="text-emerald-400">*</span>
        </label>
        <input
          id="where_text"
          type="text"
          value={whereText}
          onChange={(e) => setWhereText(e.target.value.slice(0, MAX_WHERE_LEN))}
          maxLength={MAX_WHERE_LEN}
          required
          placeholder="Colonia, lugar o referencia"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="who_type" className={labelClass}>
          ¿Quién lo hace? <span className="text-emerald-400">*</span>
        </label>
        <select
          id="who_type"
          value={whoType}
          onChange={(e) => setWhoType(e.target.value as WhoType | '')}
          required
          className={fieldClass}
        >
          <option value="">Selecciona…</option>
          {WHO_TYPES.map((k) => (
            <option key={k} value={k}>
              {WHO_TYPE_LABELS_ES[k]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="how_known" className={labelClass}>
          ¿Cómo te enteraste? <span className="text-emerald-400">*</span>
        </label>
        <select
          id="how_known"
          value={howKnown}
          onChange={(e) => setHowKnown(e.target.value as HowKnown | '')}
          required
          className={fieldClass}
        >
          <option value="">Selecciona…</option>
          {HOW_KNOWN.map((k) => (
            <option key={k} value={k}>
              {HOW_KNOWN_LABELS_ES[k]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="credit_handle" className={labelClass}>
          Crédito (opcional)
        </label>
        <input
          id="credit_handle"
          type="text"
          value={creditHandle}
          onChange={(e) => setCreditHandle(e.target.value.slice(0, MAX_CREDIT_LEN))}
          maxLength={MAX_CREDIT_LEN}
          placeholder="@usuario o nombre"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="contact" className={labelClass}>
          Contacto (opcional, privado)
        </label>
        <input
          id="contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value.slice(0, MAX_CONTACT_LEN))}
          maxLength={MAX_CONTACT_LEN}
          placeholder="Email o WhatsApp — no se publica"
          className={fieldClass}
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-slate-700/80 bg-[#151c26]/60 p-3 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
        />
        <span className="leading-relaxed">{CONSENT_TEXT_ES}</span>
      </label>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-[#0f1419] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Enviando…' : 'Enviar reconocimiento'}
      </button>
    </form>
  )
}
