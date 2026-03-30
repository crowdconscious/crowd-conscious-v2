import LandingNav from '@/app/components/landing/LandingNav'

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="print:hidden">
        <LandingNav />
      </div>
      <div className="pt-20 print:pt-0">{children}</div>
    </>
  )
}
