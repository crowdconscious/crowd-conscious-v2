'use client'

import { useEffect, useState } from 'react'

type Member = { id: string; email: string; role: 'owner' | 'viewer'; accepted_at: string | null }

const T = {
  es: { title: 'Equipo', seats: (n: number, m: number) => `${n} de ${m} lugares`, owner: 'Administrador', viewer: 'Lectura', pending: 'invitación pendiente', invite: 'Invitar', email: 'Correo', remove: 'Quitar', err: 'No se pudo completar.', full: 'Ya usó todos sus lugares.' },
  en: { title: 'Team', seats: (n: number, m: number) => `${n} of ${m} seats`, owner: 'Owner', viewer: 'Viewer', pending: 'invite pending', invite: 'Invite', email: 'Email', remove: 'Remove', err: 'Could not complete.', full: 'All seats are in use.' },
}

export default function TeamPanel({ slug, locale, canEdit }: { slug: string; locale: 'es' | 'en'; canEdit: boolean }) {
  const t = T[locale]
  const [members, setMembers] = useState<Member[]>([])
  const [limit, setLimit] = useState(10)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'owner'>('viewer')
  const [err, setErr] = useState<string | null>(null)
  const api = `/api/org/${slug}/miembros`
  const load = () => fetch(api).then((r) => r.json()).then((j) => { setMembers(j.members ?? []); setLimit(j.seatLimit ?? 10) })
  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) })
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error === 'seat_limit' ? t.full : t.err)
    setEmail('')
    void load()
  }
  async function remove(id: string) {
    const r = await fetch(`${api}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!r.ok) return setErr(t.err)
    void load()
  }

  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold text-white">{t.title}</p>
        <p className="text-xs text-slate-300">{t.seats(members.length, limit)}</p>
      </div>
      <ul className="mt-3 divide-y divide-[#2d3748]">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0 break-all text-sm text-slate-100">{m.email}</span>
            <span className="text-xs text-slate-300">
              {m.role === 'owner' ? t.owner : t.viewer}
              {m.accepted_at ? '' : ` · ${t.pending}`}
              {canEdit ? <button type="button" onClick={() => remove(m.id)} className="ml-3 min-h-[36px] text-amber-200 underline">{t.remove}</button> : null}
            </span>
          </li>
        ))}
      </ul>
      {canEdit && members.length < limit ? (
        <form onSubmit={invite} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="invite-email">{t.email}</label>
          <input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.email}
            className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-slate-600 bg-[#0f1419] px-3 text-slate-100" />
          <select value={role} onChange={(e) => setRole(e.target.value as 'viewer' | 'owner')} className="min-h-[44px] rounded-lg border border-slate-600 bg-[#0f1419] px-2 text-slate-100" aria-label="role">
            <option value="viewer">{t.viewer}</option>
            <option value="owner">{t.owner}</option>
          </select>
          <button type="submit" className="min-h-[44px] rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-[#0f1419]">{t.invite}</button>
        </form>
      ) : null}
      {err ? <p className="mt-2 text-sm text-amber-200" role="alert">{err}</p> : null}
    </div>
  )
}
