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
import { DraftBanner } from '@/components/predictions/DraftBanner'
import { loadMarketVoteReasoningsWithAuthors } from '@/lib/market-vote-reasonings'
import { SITE_URL } from '@/lib/seo/site'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  // Use the admin client so drafts are also visible at metadata time —
  // they're suppressed below via robots:noindex but we still need the row
  // to compute the cover image and title for admins/creators previewing.
  const admin = createAdminClient()
  const { data: market } = await admin
    .from('prediction_markets')
    .select(
      'title, translations, pulse_client_name, is_pulse, market_type, category, is_draft, cover_image_url'
    )
    .eq('id', id)
    .maybeSingle()

  if (market?.is_draft) {
    return {
      title: 'Borrador | Conscious Pulse',
      robots: { index: false, follow: false },
    }
  }

  const legacyPulse =
    market &&
    !market.is_pulse &&
    market.category !== 'pulse' &&
    market.market_type === 'multi' &&
    market.category === 'government'

  const showPulse =
    market &&
    (market.is_pulse || market.category === 'pulse' || legacyPulse)

  if (!showPulse) {
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

  // WhatsApp / Telegram / Twitter / iMessage all read og:image. Prefer the
  // uploaded Pulse cover (1.91:1 hero art) so the share card is the
  // curated thumbnail. Fall back to the dynamic chart card only when no
  // cover was uploaded — never to a small sponsor/client logo, since
  // WhatsApp downgrades small images to its tiny "favicon" preview style.
  const uploadedCover = market.cover_image_url?.trim() || null
  const fallbackOg = `${SITE_URL}/api/og/market/${id}`
  const ogImage = uploadedCover || fallbackOg

  return {
    title: `${pageTitle} | Conscious Pulse`,
    description: `Resultados — ${title}. Medición de sentimiento público. Powered by Crowd Conscious.`,
    openGraph: {
      title: `${pageTitle} | Conscious Pulse`,
      description: `Resultados en vivo — ${title}`,
      url: `${SITE_URL}/pulse/${id}`,
      siteName: 'Crowd Conscious',
      images: [{ url: ogImage, alt: pageTitle }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageTitle} | Conscious Pulse`,
      description: `Resultados en vivo — ${title}`,
      images: [ogImage],
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
      created_by,
      is_draft,
      pulse_client_name,
      pulse_client_logo,
      sponsor_name,
      sponsor_logo_url,
      sponsor_account_id,
      market_outcomes ( id, label, probability, sort_order, translations ),
      market_votes ( id, confidence, outcome_id, created_at, user_id, anonymous_participant_id, reasoning )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !market) {
    notFound()
  }

  const legacyPulse =
    !market.is_pulse &&
    (market as { category?: string | null }).category !== 'pulse' &&
    (market as { market_type?: string | null }).market_type === 'multi' &&
    (market as { category?: string | null }).category === 'government'

  const showPulse =
    market.is_pulse ||
    (market as { category?: string | null }).category === 'pulse' ||
    legacyPulse

  if (!showPulse) {
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

  // Draft access guard: hide the existence of a draft from anyone other than
  // an admin or the market's creator. Returning notFound() (instead of a
  // distinct 403) avoids leaking the fact that a draft URL exists.
  const isDraft = (market as { is_draft?: boolean }).is_draft === true
  const isCreator =
    !!user && (market as { created_by?: string | null }).created_by === user.id
  if (isDraft && !isAdmin && !isCreator) {
    notFound()
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

  const featuredReasonings = await loadMarketVoteReasoningsWithAuthors(admin, id, locale)

  return (
    <>
      {isDraft && <DraftBanner marketId={market.id} />}
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
        featuredReasonings={featuredReasonings}
      />
    </>
  )
}
