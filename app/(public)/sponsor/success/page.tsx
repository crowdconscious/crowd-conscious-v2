import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { CheckCircle, Share2, ArrowRight } from 'lucide-react'
import LandingNav from '@/app/components/landing/LandingNav'
import { calculateFundAllocationRounded, normalizeSponsorTierId } from '@/lib/sponsor-tiers'

const Footer = dynamic(() => import('@/components/Footer'))

async function getSessionDetails(sessionId: string) {
  if (!sessionId) return null
  try {
    const { getStripe } = await import('@/app/api/webhooks/stripe/lib/stripe-webhook-utils')
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    })
    if (session.payment_status !== 'paid') return { sessionId }
    const metadata = session.metadata || {}
    const marketId = metadata.market_id as string | undefined
    let marketTitle: string | undefined
    if (marketId) {
      const supabase = await createClient()
      const { data: m } = await supabase
        .from('prediction_markets')
        .select('title')
        .eq('id', marketId)
        .single()
      marketTitle = m?.title
    }
    return {
      sessionId,
      sponsorName: metadata.sponsor_name as string | undefined,
      tier: metadata.tier as string | undefined,
      amountMXN: session.amount_total ? session.amount_total / 100 : undefined,
      marketId,
      marketTitle,
      category: metadata.category as string | undefined,
    }
  } catch {
    return { sessionId }
  }
}

export default async function SponsorSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const sessionId = params.session_id
  const session = sessionId ? await getSessionDetails(sessionId) : null

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
  const marketUrl = session?.marketId ? `${baseUrl}/predictions/markets/${session.marketId}` : `${baseUrl}/predictions/markets`
  const shareUrl = session?.marketId ? marketUrl : `${baseUrl}/sponsor`
  const shareText = encodeURIComponent(
    session?.marketTitle
      ? `I just sponsored "${session.marketTitle}" on Crowd Conscious! 🎯`
      : 'I just sponsored a prediction market on Crowd Conscious! 🎯'
  )
  const twitterShare = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`
  const linkedInShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`

  let fundBullet =
    'Between 20% and 40% of estimated net from your sponsorship (by tier) has been allocated to the Conscious Fund.'
  if (session?.amountMXN != null) {
    const alloc = calculateFundAllocationRounded(
      session.amountMXN,
      normalizeSponsorTierId(session?.tier)
    )
    fundBullet = `${Math.round(alloc.fundPercent * 100)}% of estimated net from your sponsorship has been allocated to the Conscious Fund.`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNav />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Thank you for sponsoring!
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            {session?.marketTitle ? (
              <>Your brand will appear on <strong className="text-white">&quot;{session.marketTitle}&quot;</strong> within minutes — or instantly if the webhook has already processed.</>
            ) : (
              <>Your payment was successful. Your brand will appear on the market within minutes — or instantly if the webhook has already processed.</>
            )}
          </p>

          {session?.marketTitle && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-slate-500 text-sm mb-2">Preview: Your sponsored market card</p>
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <p className="text-white font-medium">{session.marketTitle}</p>
                {session.sponsorName && (
                  <p className="text-emerald-400 text-sm mt-2">Sponsored by {session.sponsorName}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8 text-left">
            <h2 className="font-semibold text-white mb-2">What happens next?</h2>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>• You&apos;ll receive a confirmation email shortly</li>
              <li>• Your logo and name will appear on the market card, detail page, and share images</li>
              <li>• {fundBullet}</li>
              <li>• Users will see your brand when they predict and share</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href={session?.marketId ? `/predictions/markets/${session.marketId}` : '/predictions/markets'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              {session?.marketId ? 'View your sponsored market' : 'Browse Markets'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sponsor"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-200 font-medium transition-colors"
            >
              Back to Sponsor
            </Link>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <p className="text-slate-400 text-sm mb-4">Share your sponsorship</p>
            <div className="flex gap-4 justify-center">
              <a
                href={twitterShare}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Twitter
              </a>
              <a
                href={linkedInShare}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
