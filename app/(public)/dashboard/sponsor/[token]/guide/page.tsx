import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { BookOpen, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SponsorGuidePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: account } = await admin
    .from('sponsor_accounts')
    .select('id')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (!account) notFound()

  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/dashboard/sponsor/${token}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>
        <div className="flex items-center gap-4">
          <BookOpen className="h-10 w-10 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Cómo usar tu dashboard</h1>
        </div>
        <div className="mt-8 max-w-none space-y-4 text-sm text-slate-300">
          <p>
            Este enlace privado te permite ver el rendimiento de tus mercados y Pulses sin iniciar sesión
            en la plataforma. Guárdalo en un lugar seguro.
          </p>
          <h2 className="text-lg font-semibold text-white">Métricas</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-400">
            <li>
              <strong className="text-slate-200">Mercados activos</strong>: mercados con estado activo o en
              trading.
            </li>
            <li>
              <strong className="text-slate-200">Votos</strong>: total de votos registrados en tus mercados
              vinculados.
            </li>
            <li>
              <strong className="text-slate-200">Certeza</strong>: promedio de la escala 1–10 que los
              participantes indican al votar (Pulse).
            </li>
            <li>
              <strong className="text-slate-200">Al Fondo</strong>: monto estimado aportado al Fondo
              Consciente desde tu cuenta de patrocinador.
            </li>
          </ul>
          <h2 className="text-lg font-semibold text-white">Reportes y datos</h2>
          <p className="text-slate-400">
            Desde <strong className="text-slate-200">Reportes</strong> abres una vista imprimible (PDF) por
            mercado. Desde cada tarjeta puedes descargar <strong className="text-slate-200">CSV</strong> con
            los votos (Pulse).
          </p>
          <h2 className="text-lg font-semibold text-white">Soporte</h2>
          <p className="text-slate-400">
            Escríbenos a{' '}
            <a href="mailto:comunidad@crowdconscious.app" className="text-emerald-400 hover:underline">
              comunidad@crowdconscious.app
            </a>{' '}
            para vincular mercados existentes a tu cuenta o configurar nuevos patrocinios.
          </p>
        </div>
      </div>
    </div>
  )
}
