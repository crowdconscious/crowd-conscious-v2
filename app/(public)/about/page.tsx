import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import { CONSCIOUS_FUND_PERCENT } from '@/lib/fund-allocation'

const LandingNav = dynamic(() => import('@/app/components/landing/LandingNav'))
const Footer = dynamic(() => import('@/components/Footer'))
const AboutContent = dynamic(() => import('./AboutContent'))

export const revalidate = 60

async function getAboutData() {
  const supabase = await createClient()

  const [
    { data: sponsorMarkets },
    { data: causes },
    { data: fund },
  ] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select('id, sponsor_contribution')
      .not('sponsor_name', 'is', null)
      .gt('sponsor_contribution', 0),
    supabase.from('fund_causes').select('id').eq('active', true),
    supabase.from('conscious_fund').select('total_collected, total_disbursed').limit(1).single(),
  ])

  const sponsorTotal =
    (sponsorMarkets ?? []).reduce(
      (sum, m) => sum + Number((m as { sponsor_contribution?: number }).sponsor_contribution ?? 0),
      0
    ) ?? 0
  const legacyBalance = Math.max(
    0,
    Number(fund?.total_collected ?? 0) - Number(fund?.total_disbursed ?? 0)
  )
  const totalFund = Math.round(sponsorTotal * CONSCIOUS_FUND_PERCENT + legacyBalance)
  const causesSupported = (causes ?? []).length
  const monthlyAllocation = totalFund > 0 ? Math.floor(totalFund / 12) : 0

  return {
    totalFund,
    causesSupported,
    monthlyAllocation,
  }
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

export default async function AboutPage() {
  let fundData = { totalFund: 0, causesSupported: 0, monthlyAllocation: 0 }
  try {
    fundData = await getAboutData()
  } catch (e) {
    console.error('About page fund fetch error:', e)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <LandingNav />

      <main className="pt-24">
        <AboutContent
          fundTotal={formatCurrency(fundData.totalFund)}
          causesSupported={fundData.causesSupported}
          monthlyAllocation={formatCurrency(fundData.monthlyAllocation)}
        />
      </main>

      <Footer />
    </div>
  )
}
