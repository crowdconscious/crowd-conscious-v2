import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import CreatePulseForm from '@/components/sponsor/CreatePulseForm'

export const dynamic = 'force-dynamic'

export default async function CreatePulsePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: account } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, is_pulse_client, logo_url')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (!account) notFound()

  if (account.is_pulse_client !== true) {
    redirect(`/dashboard/sponsor/${token}`)
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href={`/dashboard/sponsor/${token}`}
          className="text-sm text-emerald-400 hover:underline"
        >
          ← Volver al dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">Crear un Pulse</h1>
        <p className="mt-1 mb-2 text-sm text-gray-400">
          Define la pregunta, opciones y fecha de cierre. Tu Pulse quedará vinculado a {account.company_name}.
        </p>
        <CreatePulseForm
          token={token}
          companyName={account.company_name}
          initialLogoUrl={account.logo_url}
        />
      </div>
    </div>
  )
}
