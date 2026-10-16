import { LUGAR_CONSCIENTE_ENABLED } from '@/lib/lugar/config'
import { listAwardsForAdmin } from '@/lib/lugar/repo'
import SealAwardActions from './SealAwardActions'

export const dynamic = 'force-dynamic'

/** Admin review / override for Lugar Consciente (admin guard lives in app/admin/layout.tsx). */
export default async function AdminSellos() {
  if (!LUGAR_CONSCIENTE_ENABLED) return <div className="p-6 text-slate-200">Lugar Consciente está desactivado (LUGAR_CONSCIENTE_ENABLED). Aplique la migración 289 primero.</div>
  const rows = await listAwardsForAdmin()
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) : '—')
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-white">Lugar Consciente · revisión</h1>
      <p className="mt-1 text-sm text-slate-300">Pendientes primero. Aprobar, revocar o extender 12 meses; cada acción queda registrada. Para otorgar a mano use la API con location_id (requiere valores aceptados).</p>
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-white">{r.conscious_locations?.name ?? r.orgs?.name ?? '—'}</span>
              <span className="rounded border border-slate-500 px-1.5 text-slate-100">{r.status}</span>
              <span className="text-slate-300">{r.awarded_by}</span>
              <span className="text-slate-300">desde {fmt(r.earned_at)} · vence {fmt(r.expires_at)}</span>
            </div>
            {r.suspicious ? <p className="mt-1 text-sm text-amber-200">Señales: {JSON.stringify(r.suspicious)}</p> : null}
            {r.note ? <p className="mt-1 text-sm text-slate-200">Nota: {r.note}</p> : null}
            <SealAwardActions id={r.id} status={r.status} />
          </li>
        ))}
        {rows.length === 0 ? <li className="text-slate-300">Sin registros.</li> : null}
      </ul>
    </div>
  )
}
