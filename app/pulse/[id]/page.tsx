import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { getMarketText } from '@/lib/i18n/market-translations'
import PulseResultClient, {
  type PulseOutcomeRow,
  type PulseVoteRow,
} from '@/components/pulse/PulseResultClient'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: market } = await supabase
    .from('prediction_markets')
    .select('title, translations, pulse_client_name, is_pulse, market_type, category')
    .eq('id', id)
    .maybeSingle()

  const legacyPulse =
    market &&
    !market.is_pulse &&
    market.market_type === 'multi' &&
    market.category === 'government'

  if (!market || (!market.is_pulse && !legacyPulse)) {
    return { title: 'Conscious Pulse' }
  }

  const title = getMarketText(
    {
      title: market.title,
      translations: market.translations as Parameters<typeof getMarketText>[0]['translations'],
    },
    'title',
    'es'
  )
  const client = market.pulse_client_name?.trim()
  const pageTitle = client ? `${title} · ${client}` : title

  return {
    title: `${pageTitle} | Conscious Pulse`,
    description: `Resultados — ${title}. Medición de sentimiento público. Powered by Crowd Conscious.`,
    openGraph: {
      title: `${pageTitle} | Conscious Pulse`,
      description: `Resultados en vivo — ${title}`,
    },
  }
}

export default async function PulseResultPage({ params, searchParams }: Props) {
  const { id } = await params
  const { token } = await searchParams
  const admin = createAdminClient()

  const { data: market, error } = await admin
    .from('prediction_markets')
    .select(
      `
      id,
      title,
      description,
      translations,
      status,
      resolution_date,
      is_pulse,
      market_type,
      category,
      pulse_client_name,
      pulse_client_logo,
      sponsor_name,
      sponsor_logo_url,
      sponsor_account_id,
      market_outcomes ( id, label, probability, sort_order, translations ),
      market_votes ( id, confidence, outcome_id, created_at, user_id, anonymous_participant_id )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !market) {
    notFound()
  }

  const legacyPulse =
    !market.is_pulse &&
    (market as { market_type?: string | null }).market_type === 'multi' &&
    (market as { category?: string | null }).category === 'government'

  if (!market.is_pulse && !legacyPulse) {
    redirect(`/predictions/markets/${id}`)
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const user = await getCurrentUser()
  let isAdmin = false
  if (user) {
    const ut = (user as { user_type?: string }).user_type
    const em = (user as { email?: string | null }).email?.toLowerCase().trim()
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    isAdmin = ut === 'admin' || (!!adminEmail && !!em && em === adminEmail)
  }

  let tokenValid = false
  const sponsorAccountId = (market as { sponsor_account_id?: string | null }).sponsor_account_id
  if (token && sponsorAccountId) {
    const { data: acc } = await admin
      .from('sponsor_accounts')
      .select('access_token')
      .eq('id', sponsorAccountId)
      .maybeSingle()
    tokenValid = !!(acc as { access_token?: string } | null)?.access_token && (acc as { access_token: string }).access_token === token
  }

  const isEnhancedView = isAdmin || tokenValid

  const votes = (market.market_votes ?? []) as PulseVoteRow[]
  const outcomes = (market.market_outcomes ?? []) as PulseOutcomeRow[]

  return (
    <PulseResultClient
      marketId={market.id}
      title={market.title}
      description={market.description}
      translations={market.translations}
      status={market.status}
      resolutionDate={market.resolution_date}
      pulseClientName={market.pulse_client_name}
      pulseClientLogo={market.pulse_client_logo}
      sponsorName={market.sponsor_name}
      sponsorLogoUrl={market.sponsor_logo_url}
      outcomes={outcomes}
      votes={votes}
      locale={locale}
      isEnhancedView={isEnhancedView}
    />
  )
}
