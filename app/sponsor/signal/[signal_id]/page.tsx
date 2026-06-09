import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import {
  signalCategoryToPillar,
  fundPillarLabel,
} from '@/lib/fund/pillars'
import SponsorSignalForm from './SponsorSignalForm'

export const dynamic = 'force-dynamic'

function readLocale(c: {
  get: (k: string) => { value?: string } | undefined
}): CitizenSignalsLocale {
  return c.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

type PageProps = {
  params: Promise<{ signal_id: string }>
}

/**
 * Public sponsor entry for a Citizen Signal (Prompt 5).
 *
 * Only reachable for `sponsorable = true` signals. READ-ONLY of the signal:
 * this page (and the API behind the form) never write the signal's content,
 * status, thresholds or co-firma counts.
 */
export default async function SponsorSignalPage({ params }: PageProps) {
  if (process.env.SIGNALS_ENABLED !== 'true') notFound()

  const { signal_id } = await params
  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  const admin = createAdminClient()
  const { data: signal } = await admin
    .from('citizen_signals')
    .select('id, title, public_slug, category, sponsorable')
    .eq('id', signal_id)
    .maybeSingle()

  const row = signal as
    | {
        id: string
        title: string
        public_slug: string
        category: string | null
        sponsorable: boolean | null
      }
    | null

  const pillarLabel = row
    ? fundPillarLabel(signalCategoryToPillar(row.category), locale)
    : ''

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
        {t.sponsor.checkout.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
        {t.sponsor.checkout.title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        {t.sponsor.checkout.subtitle}
      </p>

      {!row ? (
        <div className="mt-8 rounded-2xl border border-[#2d3748] bg-[#11161f] p-6 text-sm text-slate-300">
          {t.sponsor.checkout.notFound}
        </div>
      ) : !row.sponsorable ? (
        <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-200">
          {t.sponsor.checkout.notSponsorable}
        </div>
      ) : (
        <div className="mt-8">
          <div className="mb-5 rounded-2xl border border-[#2d3748] bg-[#11161f] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t.sponsor.checkout.signalLabel}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{row.title}</p>
            <p className="mt-2 text-xs text-emerald-200/90">
              {t.sponsor.transparency(pillarLabel)}
            </p>
          </div>

          <SponsorSignalForm
            locale={locale}
            signalId={row.id}
            defaultBadgeMessage=""
          />

          <p className="mt-4 text-xs text-slate-500">
            {t.sponsor.checkout.disclosure}
          </p>
        </div>
      )}

      <Link
        href={row ? `/signals/${row.public_slug}` : '/signals'}
        className="mt-8 inline-block text-xs text-slate-400 underline hover:text-emerald-300"
      >
        ← {locale === 'es' ? 'Volver a la señal' : 'Back to the signal'}
      </Link>
    </main>
  )
}
