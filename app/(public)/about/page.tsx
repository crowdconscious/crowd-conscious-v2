import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import LandingNav from '@/app/components/landing/LandingNav'
import { SITE_URL } from '@/lib/seo/site'
import { fetchConsciousFundBalanceMxn } from '@/lib/conscious-fund-balance'
import { CONSCIOUS_FUND_GOAL_MXN } from '@/lib/predictions/fund-goal'

export const metadata: Metadata = {
  title: {
    absolute: 'Acerca de | Crowd Conscious',
  },
  description:
    'Crowd Conscious combina consultas con confianza ponderada e impacto social. Entre el 20% y 40% de cada patrocinio va directamente a causas comunitarias — hasta 10× el promedio de la industria en causa marketing. Basados en Ciudad de México.',
  alternates: {
    canonical: `${SITE_URL}/about`,
    languages: {
      'es-MX': `${SITE_URL}/about`,
      'en-US': `${SITE_URL}/about`,
    },
  },
}

const Footer = dynamic(() => import('@/components/Footer'))
const AboutContent = dynamic(() => import('./AboutContent'))

export const revalidate = 60

async function getAboutData() {
  const supabase = await createClient()

  // Fund total read via admin client (bypasses RLS) so anonymous visitors
  // see the same number the dashboard does. See migration 198.
  const [{ data: causes }, totalFund] = await Promise.all([
    supabase.from('fund_causes').select('id').eq('active', true),
    fetchConsciousFundBalanceMxn(),
  ])

  const causesSupported = (causes ?? []).length
  const monthlyAllocation = totalFund > 0 ? Math.floor(totalFund / 12) : 0

  return {
    totalFund: Math.round(totalFund),
    causesSupported,
    monthlyAllocation,
    goalMxn: CONSCIOUS_FUND_GOAL_MXN,
  }
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

export default async function AboutPage() {
  let fundData = {
    totalFund: 0,
    causesSupported: 0,
    monthlyAllocation: 0,
    goalMxn: CONSCIOUS_FUND_GOAL_MXN,
  }
  try {
    fundData = await getAboutData()
  } catch (e) {
    console.error('About page fund fetch error:', e)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-cc-bg text-cc-text-primary">
      <LandingNav />

      <main className="pt-24">
        <AboutContent
          fundTotal={formatCurrency(fundData.totalFund)}
          fundTotalMxn={fundData.totalFund}
          fundGoalMxn={fundData.goalMxn}
          causesSupported={fundData.causesSupported}
          monthlyAllocation={formatCurrency(fundData.monthlyAllocation)}
        />
      </main>

      <Footer />
    </div>
  )
}
