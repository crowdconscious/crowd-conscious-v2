import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import ReconocimientosTriage from '@/components/admin/ReconocimientosTriage'

export const dynamic = 'force-dynamic'

/**
 * /admin/reconocimientos — moderation triage for positive recognitions.
 */
export default async function AdminReconocimientosPage() {
  const user = await getCurrentUser()
  if (!user || !isAdminUser(user)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Crowd Conscious
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Reconocimientos
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Revisa envíos, aprueba o rechaza. Solo lo aprobado es público.
          </p>
        </header>

        <ReconocimientosTriage />
      </main>
    </div>
  )
}
