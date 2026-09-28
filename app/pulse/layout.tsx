import LandingNav from '@/app/components/landing/LandingNav'

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="print:hidden" data-site-chrome="nav">
        <LandingNav />
      </div>
      {/* sim-pulse-chrome-pad: capture mode zeroes this via html[data-sim-capture] */}
      <div className="sim-pulse-chrome-pad pt-20 print:pt-0">{children}</div>
    </>
  )
}
