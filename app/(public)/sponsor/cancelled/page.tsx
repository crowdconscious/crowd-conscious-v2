import dynamic from 'next/dynamic'
import Link from 'next/link'
import { XCircle, Mail, ArrowLeft } from 'lucide-react'

const LandingNav = dynamic(() => import('@/app/components/landing/LandingNav'))
const Footer = dynamic(() => import('@/components/Footer'))

export default function SponsorCancelledPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNav />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-8">
            <XCircle className="w-12 h-12 text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Sponsorship not completed
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            No worries — your payment was not processed. If you&apos;d like to sponsor a market,
            you can try again or contact us directly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sponsor"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sponsor
            </Link>
            <a
              href="mailto:francisco@crowdconscious.app?subject=Sponsorship%20Inquiry"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-200 font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Us
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
