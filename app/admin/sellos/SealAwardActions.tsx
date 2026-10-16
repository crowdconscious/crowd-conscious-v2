'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SealAwardActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  async function act(action: 'approve' | 'revoke' | 'extend') {
    if (action === 'revoke' && !confirm('¿Revocar este sello?')) return
    setBusy(true)
    const res = await fetch('/api/admin/seal-awards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, award_id: id, note: note || undefined }) })
    setBusy(false)
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? 'error')
    router.refresh()
  }
  const btn = 'min-h-[44px] rounded-lg border px-3 text-sm font-semibold disabled:opacity-60'
  if (!['pending', 'active'].includes(status)) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" maxLength={1000} className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-[#3b4757] bg-[#0f1419] px-3 text-sm text-white" />
      {status === 'pending' ? <button disabled={busy} onClick={() => act('approve')} className={`${btn} border-emerald-300 text-emerald-100`}>Aprobar</button> : null}
      {status === 'active' ? <button disabled={busy} onClick={() => act('extend')} className={`${btn} border-sky-300 text-sky-100`}>Extender 12 meses</button> : null}
      <button disabled={busy} onClick={() => act('revoke')} className={`${btn} border-red-300 text-red-100`}>Revocar</button>
    </div>
  )
}
