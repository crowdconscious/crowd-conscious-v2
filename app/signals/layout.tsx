import LandingNav from '@/app/components/landing/LandingNav'

/**
 * /signals shell. Same dark Pulse rhythm — LandingNav on top, content padded
 * for the fixed-nav offset. Children render against a `bg-[#0f1419]` page on
 * each leaf so we don't fight `src/app/globals.css` body-light overrides.
 */
export default function SignalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="print:hidden">
        <LandingNav />
      </div>
      <div className="pt-20 print:pt-0">{children}</div>
    </>
  )
}
