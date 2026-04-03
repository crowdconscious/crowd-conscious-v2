import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { MarketDetailClient } from './MarketDetailClient'
import { getMarketText } from '@/lib/i18n/market-translations'
import { SITE_URL } from '@/lib/seo/site'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const supabase = await createClient()
  const { data: market } = await supabase
    .from('prediction_markets')
    .select('title, description, translations, total_votes')
    .eq('id', id)
    .single()

  if (!market) {
    return { title: 'Prediction Market | Crowd Conscious' }
  }

  const title = getMarketText(market, 'title', locale) || 'Prediction Market'
  const baseDesc =
    getMarketText(market, 'description', locale)?.slice(0, 160) ||
    `Predice sobre: ${title}. ${market.total_votes ?? 0} votos. 100% gratis en Crowd Conscious.`
  const description = baseDesc
  const ogImage = `${SITE_URL}/api/og/market/${id}${locale === 'en' ? '?lang=en' : ''}`
  const canonical = `${SITE_URL}/predictions/markets/${id}`

  return {
    title: `${title} | Crowd Conscious`,
    description,
    openGraph: {
      title: `${title} | Crowd Conscious`,
      description,
      url: canonical,
      siteName: 'Crowd Conscious',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Crowd Conscious`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical,
      languages: {
        'es-MX': canonical,
        'en-US': canonical,
      },
    },
  }
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getCurrentUser()

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const profileEmail = user?.email?.toLowerCase().trim()
  const isAdmin =
    !!user &&
    (user.user_type === 'admin' ||
      (!!adminEmail && !!profileEmail && profileEmail === adminEmail))

  const { data: market, error: marketError } = await supabase
    .from('prediction_markets')
    .select('*')
    .eq('id', id)
    .single()

  if (marketError || !market) {
    notFound()
  }

  const admin = createAdminClient()

  const [
    { data: creator },
    { data: outcomes },
    { data: myVoteRow },
    { count: totalVoteRows },
    { count: registeredVoteRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', market.created_by)
      .single(),
    supabase
      .from('market_outcomes')
      .select('id, label, probability, vote_count, total_confidence, is_winner, sort_order, translations')
      .eq('market_id', id)
      .order('sort_order', { ascending: true }),
    user
      ? supabase
          .from('market_votes')
          .select('outcome_id, confidence, xp_earned, is_correct, bonus_xp')
          .eq('market_id', id)
          .eq('user_id', user.id)
          .single()
      : Promise.resolve({ data: null }),
    admin.from('market_votes').select('*', { count: 'exact', head: true }).eq('market_id', id),
    admin
      .from('market_votes')
      .select('*', { count: 'exact', head: true })
      .eq('market_id', id)
      .eq('is_anonymous', false),
  ])

  const engagementCount =
    (totalVoteRows ?? Number((market as { engagement_count?: number }).engagement_count)) || 0
  const registeredVoteCount = registeredVoteRows ?? 0
  const outcomesList = (outcomes || []).map((o) => ({
    id: o.id,
    label: o.label,
    probability: Number(o.probability),
    vote_count: o.vote_count ?? 0,
    total_confidence: o.total_confidence ?? 0,
    is_winner: o.is_winner,
    translations: (o as { translations?: unknown }).translations,
  }))

  let myVote: { outcome_id: string; outcome_label: string; confidence: number; xp_earned: number; is_correct: boolean | null; bonus_xp: number } | null = null
  if (myVoteRow) {
    const outcomeLabel = (outcomes || []).find((o) => o.id === myVoteRow.outcome_id)?.label ?? null
    myVote = {
      outcome_id: myVoteRow.outcome_id,
      outcome_label: outcomeLabel ?? 'Unknown',
      confidence: myVoteRow.confidence,
      xp_earned: myVoteRow.xp_earned,
      is_correct: myVoteRow.is_correct,
      bonus_xp: myVoteRow.bonus_xp ?? 0,
    }
  }

  const resolutionEvidence = (market.resolution_evidence as { evidence_url?: string }) || {}

  let showPulseDashboardLink = false
  const isPulseLike =
    (market as { is_pulse?: boolean }).is_pulse === true ||
    (market as { category?: string }).category === 'pulse'
  if (isPulseLike) {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const profileEmail = (user as { email?: string | null } | null)?.email?.toLowerCase().trim()
    const isAdmin =
      (user as { user_type?: string } | null)?.user_type === 'admin' ||
      (!!adminEmail && !!profileEmail && profileEmail === adminEmail)

    let isSponsorOwner = false
    const sponsorAccountId = (market as { sponsor_account_id?: string | null }).sponsor_account_id
    if (user && sponsorAccountId) {
      const admin = createAdminClient()
      const { data: sa } = await admin
        .from('sponsor_accounts')
        .select('user_id')
        .eq('id', sponsorAccountId)
        .maybeSingle()
      const uid = (sa as { user_id?: string | null } | null)?.user_id
      isSponsorOwner = !!uid && uid === user.id
    }

    showPulseDashboardLink = isAdmin || isSponsorOwner
  }

  const { data: relatedRows } = await supabase
    .from('prediction_markets')
    .select('id, title, translations, total_votes, is_pulse, category')
    .in('status', ['active', 'trading'])
    .is('archived_at', null)
    .neq('id', id)
    .order('total_votes', { ascending: false })
    .limit(3)

  const relatedMarkets = (relatedRows || []).map((r) => ({
    id: r.id,
    title: r.title,
    translations: r.translations as { en?: { title?: string } } | null | undefined,
    total_votes: r.total_votes ?? null,
    is_pulse: r.is_pulse === true,
    category: r.category,
  }))

  return (
    <MarketDetailClient
      market={market}
      creatorName={creator?.full_name || 'Unknown'}
      history={[]}
      agentContent={[]}
      sentiment={[]}
      trades={[]}
      engagementCount={engagementCount}
      registeredVoteCount={registeredVoteCount}
      totalConsciousFromMarket={0}
      resolutionEvidence={resolutionEvidence}
      outcomes={outcomesList}
      myVote={myVote}
      isAuthenticated={!!user}
      showPulseDashboardLink={showPulseDashboardLink}
      relatedMarkets={relatedMarkets}
      isAdmin={isAdmin}
    />
  )
}
