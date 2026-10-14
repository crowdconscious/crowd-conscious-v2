import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Pulse plan upgrades / add-ons are retired (Oct 2026). Existing sponsor
 * accounts and their Pulses keep working; new purchases are not offered here
 * and the checkout endpoints reject them (lib/sponsor/legacy-sales.ts).
 */
export default async function SponsorUpgradePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { data: account } = await createAdminClient()
    .from('sponsor_accounts')
    .select('id, company_name')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()
  if (!account) notFound()

  const es = (await cookies()).get('preferred-language')?.value !== 'en'
  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-16 text-[#e2e8f0]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#2d3748] bg-[#1a2029] p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[#ffffff]">
          {es ? 'Los planes Pulse ya no están a la venta' : 'Pulse plans are no longer sold'}
        </h1>
        <p className="mt-3 text-[#cbd5e1]">
          {es
            ? 'Tu cuenta y tus Pulses siguen activos. Para medir la satisfacción de tus usuarios con certeza de 1 a 10, conoce Organizaciones.'
            : 'Your account and your Pulses remain active. To measure your users’ satisfaction with 1–10 certainty, see Organizations.'}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/organizaciones"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#047857] px-5 py-2.5 text-sm font-semibold text-[#ffffff] hover:bg-[#065f46]"
          >
            {es ? 'Ver Organizaciones' : 'See Organizations'}
          </Link>
          <Link
            href={`/dashboard/sponsor/${token}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#3b4757] px-5 py-2.5 text-sm font-medium text-[#e2e8f0]"
          >
            {es ? 'Volver a mi panel' : 'Back to my dashboard'}
          </Link>
        </div>
      </div>
    </div>
  )
}
