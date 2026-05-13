import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

const Footer = dynamic(() => import('@/components/Footer'))

function readLocale(c: {
  get: (k: string) => { value?: string } | undefined
}): CitizenSignalsLocale {
  return c.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

const SLUG_PATTERN = /^[a-z0-9-]{3,160}$/

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * /signals/nueva/listo — success surface after a successful POST /api/signals.
 *
 * The signal is `pending_review` at this point, so the public detail
 * route would return notFound for anonymous users. We still render the
 * `/signals/<slug>` link as a "view your submission" affordance because
 * the author can read their own pending signals once F10 (detail page
 * with author override) ships. For MVP it's a soft promise — the link
 * may render an "under review" preview state.
 */
export default async function SignalsComposeSuccess({
  searchParams,
}: PageProps) {
  if (process.env.SIGNALS_ENABLED !== 'true') notFound()

  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  const params = await searchParams
  const rawSlug = params.slug
  const slug =
    typeof rawSlug === 'string' && SLUG_PATTERN.test(rawSlug) ? rawSlug : null

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
          {t.nav.brand}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {t.compose.success.title}
        </h1>
        <p className="mt-3 text-slate-400">{t.compose.success.body}</p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/signals"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 sm:w-auto"
          >
            {t.compose.success.backToFeed}
          </Link>

          {slug && (
            <Link
              href={`/signals/${slug}`}
              className="text-sm text-emerald-300 underline hover:text-emerald-200"
            >
              {t.compose.success.viewSubmission}
            </Link>
          )}

          <Link
            href="/signals/nueva"
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            {t.compose.success.createAnother}
          </Link>
        </div>

        {slug && (
          <p className="mt-6 text-xs text-slate-500">
            {t.compose.success.slugCaption}
          </p>
        )}
      </main>

      <Footer />
    </div>
  )
}
