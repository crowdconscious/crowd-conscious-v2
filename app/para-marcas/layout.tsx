import LandingNav from '@/app/components/landing/LandingNav'

/**
 * Layout for the B2B "Para marcas" surface (formerly /pulse, before /pulse
 * was repurposed as the consumer Pulse listing). Identical to the original
 * `/pulse/layout.tsx` — only the URL changed.
 */
export default function ParaMarcasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="print:hidden">
        <LandingNav />
      </div>
      <div className="pt-20 print:pt-0">{children}</div>
    </>
  )
}
