import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getPublicRecognitionBySlug,
  WHO_TYPE_LABELS_ES,
} from '@/lib/reconocimientos'
import { SITE_URL } from '@/lib/seo/site'
import RecognitionShareButtons from '@/components/reconocimientos/RecognitionShareButtons'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const row = await getPublicRecognitionBySlug(slug)
  if (!row) return { title: 'Reconocimiento | Crowd Conscious' }

  const title = row.what.length > 80 ? `${row.what.slice(0, 77)}…` : row.what
  const description = `${row.where_text} · Crowd Conscious`
  const pageUrl = `${SITE_URL.replace(/\/$/, '')}/reconocimientos/${row.share_slug}`

  return {
    title: `${title} | Crowd Conscious`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: pageUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function RecognitionPublicPage({ params }: PageProps) {
  const { slug } = await params
  const row = await getPublicRecognitionBySlug(slug)
  if (!row) notFound()

  const whoLabel = WHO_TYPE_LABELS_ES[row.who_type] ?? row.who_type
  const pageUrl = `${SITE_URL.replace(/\/$/, '')}/reconocimientos/${row.share_slug}`
  const appHref = '/app'

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
          Crowd Conscious · Reconocimiento
        </p>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-[#151c26]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/reconocimientos/media/${encodeURIComponent(row.share_slug)}`}
            alt={row.what}
            className="aspect-[4/5] w-full object-cover"
          />
        </div>

        <h1 className="mt-6 text-xl font-bold leading-snug text-white sm:text-2xl">
          {row.what}
        </h1>
        <p className="mt-2 text-sm text-slate-400">{row.where_text}</p>
        <p className="mt-1 text-sm text-slate-500">{whoLabel}</p>
        {row.credit_handle && (
          <p className="mt-2 text-sm text-emerald-400/90">
            Crédito: @{row.credit_handle.replace(/^@+/, '')}
          </p>
        )}

        <div className="mt-8">
          <a
            href={appHref}
            className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-[#0f1419] transition hover:bg-emerald-400"
          >
            ¿Lo has visto? Confírmalo en la app.
          </a>
        </div>

        <div className="mt-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
            Compartir
          </p>
          <RecognitionShareButtons url={pageUrl} title={row.what} />
        </div>

        <p className="mt-10 text-center text-xs text-slate-600">
          <Link href="/reconocimientos" className="hover:text-slate-400">
            Más reconocimientos
          </Link>
          {' · '}
          <Link href="/signals" className="hover:text-slate-400">
            Reportar un problema
          </Link>
        </p>
      </main>
    </div>
  )
}
