import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { SponsorUpgradeClient } from '@/components/sponsor/SponsorUpgradeClient'
import {
  normalizeSponsorUpgradeTier,
  upgradePathFor,
} from '@/lib/sponsor-upgrade-tier'
import { PULSE_TIERS } from '@/lib/pulse-tiers'

export const dynamic = 'force-dynamic'

type AccountRow = {
  id: string
  company_name: string
  contact_email: string
  tier: string | null
  max_pulse_markets: number | null
  used_pulse_markets: number | null
  created_at: string | null
}

export default async function SponsorUpgradePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: account } = (await admin
    .from('sponsor_accounts')
    .select(
      'id, company_name, contact_email, tier, max_pulse_markets, used_pulse_markets, created_at'
    )
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()) as { data: AccountRow | null }

  if (!account) notFound()

  const cookieStore = await cookies()
  const locale: 'es' | 'en' =
    cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const normalized = normalizeSponsorUpgradeTier(account.tier)
  const path = upgradePathFor(normalized)

  // Serialize only the tier fields the client needs (no `any` leaks into
  // the payload, smaller page payload). The client imports PULSE_TIERS
  // directly too but we pre-compute the display values server-side.
  const tierSnapshots = path.map((card) => {
    const def = PULSE_TIERS[card.target]
    return {
      target: card.target,
      role: card.role,
      highlighted: !!card.highlighted,
      name: locale === 'en' ? def.nameEn : def.name,
      priceMXN: def.priceMXN,
      fundPercent: def.fundPercent,
      durationLabel: locale === 'en' ? def.durationLabelEn : def.durationLabelEs,
      features: locale === 'en' ? def.featuresEn : def.featuresEs,
      bestFor: locale === 'en' ? def.bestForEn : def.bestForEs,
      contactOnly: !!def.contactOnly,
    }
  })

  return (
    <SponsorUpgradeClient
      token={token}
      locale={locale}
      tier={normalized}
      companyName={account.company_name}
      contactEmail={account.contact_email}
      usedPulseMarkets={account.used_pulse_markets ?? 0}
      maxPulseMarkets={account.max_pulse_markets ?? 0}
      cards={tierSnapshots}
    />
  )
}
