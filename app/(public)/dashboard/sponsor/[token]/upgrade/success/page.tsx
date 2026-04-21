import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizePulseTierId, PULSE_TIERS } from '@/lib/pulse-tiers'
import esDict from '@/locales/es.json'
import enDict from '@/locales/en.json'

export const dynamic = 'force-dynamic'

type Dict = typeof esDict.sponsor_dashboard.upgrade
const dictFor = (locale: 'es' | 'en'): Dict =>
  (locale === 'en' ? enDict : esDict).sponsor_dashboard.upgrade as Dict

type SessionSummary = {
  paid: boolean
  productTypeMatches: boolean
  belongsToThisAccount: boolean
  targetTier: string | null
}

/**
 * Read Stripe to confirm the returning user actually paid. The server-side
 * UPDATE on sponsor_accounts happens in the webhook, not here — this page
 * never writes DB state, it only confirms to the user what's happening.
 */
async function loadSessionSummary(
  sessionId: string | undefined,
  expectedAccountId: string
): Promise<SessionSummary | null> {
  if (!sessionId) return null
  try {
    const { getStripe } = await import('@/app/api/webhooks/stripe/lib/stripe-webhook-utils')
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const metadata = session.metadata || {}
    const productTypeMatches = metadata.product_type === 'sponsor_upgrade'
    const belongsToThisAccount =
      (metadata.existing_sponsor_account_id as string) === expectedAccountId
    const targetTier =
      typeof metadata.target_tier === 'string'
        ? normalizePulseTierId(metadata.target_tier)
        : null
    return {
      paid: session.payment_status === 'paid',
      productTypeMatches,
      belongsToThisAccount,
      targetTier,
    }
  } catch (e) {
    console.error('[sponsor-upgrade-success] stripe retrieve failed', e)
    return null
  }
}

export default async function SponsorUpgradeSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { token } = await params
  const { session_id: sessionId } = await searchParams

  const admin = createAdminClient()
  const { data: account } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, tier')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (!account) notFound()

  const cookieStore = await cookies()
  const locale: 'es' | 'en' =
    cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = dictFor(locale)

  const summary = await loadSessionSummary(sessionId, account.id)

  // Webhook may not have fired yet, OR the session is unrelated to this
  // account. In either case we show a "processing" state rather than a
  // false "success!" claim.
  const confirmed =
    !!summary && summary.paid && summary.productTypeMatches && summary.belongsToThisAccount

  const successSubtitle = (() => {
    if (!confirmed || !summary?.targetTier) return t.success_subtitle_generic
    if (summary.targetTier === 'suscripcion') return t.success_subtitle_suscripcion
    if (summary.targetTier === 'pulse_pack') return t.success_subtitle_pulse_pack
    if (summary.targetTier === 'pulse_unico') return t.success_subtitle_pulse_unico
    return t.success_subtitle_generic
  })()

  const displayTierName = summary?.targetTier
    ? (locale === 'en'
        ? PULSE_TIERS[summary.targetTier as keyof typeof PULSE_TIERS]?.nameEn
        : PULSE_TIERS[summary.targetTier as keyof typeof PULSE_TIERS]?.name) ?? null
    : null

  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#2d3748] bg-[#11161c] p-8">
        {confirmed ? (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-bold text-white">{t.success_title}</h1>
            <p className="mt-3 text-sm text-slate-300">{successSubtitle}</p>
            {displayTierName ? (
              <p className="mt-2 text-sm text-slate-400">
                <span className="font-semibold text-slate-200">{displayTierName}</span>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <Clock className="h-12 w-12 text-amber-400" />
            <h1 className="mt-4 text-2xl font-bold text-white">{t.success_pending_title}</h1>
            <p className="mt-3 text-sm text-slate-300">{t.success_pending_body}</p>
          </>
        )}

        <Link
          href={`/dashboard/sponsor/${token}`}
          className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
        >
          {t.success_back}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
