import type { Metadata } from 'next'
import SponsorLoginClient from './SponsorLoginClient'

export const metadata: Metadata = {
  title: 'Sponsor login | Crowd Conscious',
  description: 'Ingresa con tu código de sponsor para acceder a tu dashboard.',
  robots: { index: false, follow: false },
}

export default function SponsorLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4">
      <SponsorLoginClient />
    </div>
  )
}
