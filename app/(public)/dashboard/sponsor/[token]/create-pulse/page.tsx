import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import CreatePulseForm from '@/components/sponsor/CreatePulseForm'
import esDict from '@/locales/es.json'
import enDict from '@/locales/en.json'

export const dynamic = 'force-dynamic'

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.crowdconscious.app').replace(
  /\/$/,
  ''
)

export default async function CreatePulsePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const cookieStore = await cookies()
  const rawLang = cookieStore.get('preferred-language')?.value
  const locale: 'es' | 'en' = rawLang === 'en' ? 'en' : 'es'
  const dict = locale === 'en' ? enDict.sponsor_dashboard : esDict.sponsor_dashboard

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

  const backLabel = locale === 'en' ? '← Back to dashboard' : '← Volver al dashboard'
  const lede =
    locale === 'en'
      ? `Define the question, options, and close date. Your Pulse will be linked to ${account.company_name}.`
      : `Define la pregunta, opciones y fecha de cierre. Tu Pulse quedará vinculado a ${account.company_name}.`

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href={`/dashboard/sponsor/${token}`}
          className="text-sm text-emerald-400 hover:underline"
        >
          {backLabel}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">{dict.create_form.page_title}</h1>
        <p className="mt-1 mb-2 text-sm text-gray-400">{lede}</p>
        <CreatePulseForm
          token={token}
          companyName={account.company_name}
          initialLogoUrl={account.logo_url}
          appOrigin={APP_ORIGIN}
        />
      </div>
    </div>
  )
}
