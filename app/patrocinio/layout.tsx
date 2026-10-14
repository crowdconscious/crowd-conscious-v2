import LandingNav from '@/app/components/landing/LandingNav'

export default function PatrocinioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cc-dark-surface">
      <div className="print:hidden">
        <LandingNav />
      </div>
      <div className="pt-20 print:pt-0">{children}</div>
    </div>
  )
}
