import type { Metadata } from 'next'
import Link from 'next/link'
import {
  isReconocimientosEnabled,
  sanitizeSrc,
} from '@/lib/reconocimientos'
import ReconoceForm from '@/components/reconocimientos/ReconoceForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reconoce algo bueno | Crowd Conscious',
  description:
    'Envía una foto de algo positivo que viste en tu colonia. Lo revisamos y, si cumple, lo compartimos.',
}

type PageProps = {
  searchParams: Promise<{ src?: string }>
}

export default async function ReconocePage({ searchParams }: PageProps) {
  const params = await searchParams
  const src = sanitizeSrc(params.src)

  if (!isReconocimientosEnabled()) {
    return (
      <div className="min-h-screen bg-[#0f1419] text-slate-100">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Crowd Conscious
          </p>
          <h1 className="mt-3 text-2xl font-bold text-white">Pronto</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Reconocimientos aún no está abierto. Mientras tanto, puedes ver lo
            que ya publicamos.
          </p>
          <Link
            href="/reconocimientos"
            className="mt-8 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            Ver reconocimientos
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Crowd Conscious
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Reconoce algo bueno
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            ¿Viste algo que funciona en tu colonia? Mándanos una foto. Lo
            revisamos y, si cumple, lo compartimos.
          </p>
        </header>

        <ReconoceForm src={src} />
      </main>
    </div>
  )
}
