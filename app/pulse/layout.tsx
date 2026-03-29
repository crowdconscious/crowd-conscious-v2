import LandingNav from '@/app/components/landing/LandingNav'

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      <div className="pt-20">{children}</div>
    </>
  )
}
