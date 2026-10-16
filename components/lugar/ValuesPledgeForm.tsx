'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const T = {
  es: {
    intro: 'Estos son nuestros valores. Al aceptarlos, su lugar se compromete a vivir por ellos. Es un acuerdo de buena fe, no una auditoría ni una certificación de cumplimiento.',
    name: 'Su nombre', role: 'Cargo (opcional)',
    agree: 'Acepto los 7 valores en nombre de este lugar y me comprometo a vivir por ellos. Entiendo que Crowd Conscious registra mi nombre, la fecha, la versión del texto y un hash de mi IP.',
    submit: 'Aceptar nuestros valores', busy: 'Guardando…', err: 'No se pudo guardar. Intente de nuevo.',
  },
  en: {
    intro: 'These are our values. By accepting them, your place agrees to live by them. It is a good-faith agreement, not an audit or a compliance certification.',
    name: 'Your name', role: 'Role (optional)',
    agree: 'I accept the 7 values on behalf of this place and agree to live by them. I understand Crowd Conscious records my name, the date, the text version and a hash of my IP.',
    submit: 'Accept our values', busy: 'Saving…', err: 'Could not save. Please try again.',
  },
}

/** ONE acceptance of all 7 values together (no per-item checkboxes). */
export default function ValuesPledgeForm({ endpoint, locale, extra }: { endpoint: string; locale: 'es' | 'en'; extra?: Record<string, unknown> }) {
  const t = T[locale]
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...extra, signer_name: name, signer_role: role || undefined, agree: true }) }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setErr(t.err)
    router.refresh()
  }
  const input = 'mt-1 block w-full min-h-[44px] rounded-lg border border-[#3b4757] bg-[#0f1419] px-3 text-base text-white focus:border-emerald-300 focus:outline-none'
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-slate-200">{t.intro}</p>
      <label className="block text-sm text-slate-200">{t.name}<input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} className={input} autoComplete="name" /></label>
      <label className="block text-sm text-slate-200">{t.role}<input maxLength={120} value={role} onChange={(e) => setRole(e.target.value)} className={input} autoComplete="organization-title" /></label>
      <label className="flex items-start gap-3 text-sm text-slate-200">
        <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-400" />
        <span>{t.agree}</span>
      </label>
      {err ? <p role="alert" className="text-sm text-red-300">{err}</p> : null}
      <button disabled={busy || !agree || !name.trim()} className="min-h-[44px] w-full rounded-lg bg-emerald-400 px-4 font-semibold text-[#0f1419] disabled:opacity-60 sm:w-auto">{busy ? t.busy : t.submit}</button>
    </form>
  )
}
