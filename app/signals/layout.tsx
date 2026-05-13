import dynamic from 'next/dynamic'
import LandingNav from '@/app/components/landing/LandingNav'

const Footer = dynamic(() => import('@/components/Footer'))

/**
 * /signals — public Citizen Signals surface.
 *
 * Mirrors app/pulse/layout.tsx structure (LandingNav + Footer) but applies
 * an explicit dark wrapper because src/app/globals.css forces light tokens
 * on html/body via `!important`. The data-theme="dark" attribute switches
 * the design-system custom properties to their dark values, while the
 * Tailwind classes pin the visible chrome to the Dark Pulse palette so
 * the page never flashes white.
 */
export default function SignalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      data-theme="dark"
      className="dark min-h-screen bg-[#0f1419] text-slate-100"
    >
      <div className="print:hidden">
        <LandingNav />
      </div>
      <div className="pt-20 print:pt-0">{children}</div>
      <Footer />
    </div>
  )
}
