import LandingNav from '@/app/components/landing/LandingNav'
import Footer from '@/components/Footer'

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="print:hidden">
        <LandingNav />
      </div>
      <div className="min-h-screen bg-[#0f1419] pt-20 print:pt-0">{children}</div>
      <div className="print:hidden">
        <Footer />
      </div>
    </>
  )
}
