import LandingNav from '@/app/components/landing/LandingNav'

export default function LugarConscienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="print:hidden"><LandingNav /></div>
      <div className="pt-20 print:pt-0">{children}</div>
    </div>
  )
}
