import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import LandingNav from '@/app/components/landing/LandingNav'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: {
    absolute:
      'Quiénes Somos — Consciencia Colectiva para el Bien Social | Crowd Conscious',
  },
  description:
    'Crowd Conscious combina mercados de predicción con impacto social. Entre el 20% y 40% de cada patrocinio va directamente a causas comunitarias — hasta 10× el promedio de la industria en causa marketing. Basados en Ciudad de México.',
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

  const [
    { data: causes },
    { data: fund },
  ] = await Promise.all([
    supabase.from('fund_causes').select('id').eq('active', true),
    supabase.from('conscious_fund').select('current_balance, total_collected, total_disbursed').limit(1).single(),
  ])

  const totalFund = Math.round(
    Math.max(
      0,
      Number(fund?.current_balance ?? 0) ||
        Math.max(0, Number(fund?.total_collected ?? 0) - Number(fund?.total_disbursed ?? 0))
    )
  )
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
    <div className="min-h-screen overflow-x-hidden bg-cc-bg text-cc-text-primary">
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
