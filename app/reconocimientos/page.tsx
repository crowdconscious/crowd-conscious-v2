import type { Metadata } from 'next'
import Link from 'next/link'
import { listApprovedPublic } from '@/lib/reconocimientos'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reconocimientos | Crowd Conscious',
  description:
    'Lo bueno que la gente reporta en su colonia. Fotos y historias aprobadas por Crowd Conscious.',
}

export default async function ReconocimientosIndexPage() {
  const items = await listApprovedPublic(48)

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Crowd Conscious
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Reconocimientos
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Lo bueno que la gente ve y comparte. Cada historia fue revisada
            antes de publicarse.
          </p>
          <Link
            href="/reconoce"
            className="mt-5 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            Enviar un reconocimiento
          </Link>
        </header>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay reconocimientos publicados. Sé el primero en{' '}
            <Link href="/reconoce" className="text-emerald-400 hover:underline">
              enviar uno
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/reconocimientos/${item.share_slug}`}
                  className="group block overflow-hidden rounded-2xl border border-slate-800 bg-[#151c26] transition hover:border-emerald-500/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/reconocimientos/media/${encodeURIComponent(item.share_slug)}`}
                    alt=""
                    className="aspect-[4/5] w-full object-cover transition group-hover:opacity-95"
                  />
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-medium text-white">
                      {item.what}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {item.where_text}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
